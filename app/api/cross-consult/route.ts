import { NextRequest, NextResponse } from 'next/server';
import { runCrossConsult, runCrossConsultStreaming, runMultiRoundCrossConsult } from '@/lib/orchestrator';
import type {
  CrossConsultResponse,
  CrossConsultSSEEvent,
  MultiRoundCrossConsultSSEEvent,
  DiscussionMessage,
  CrossConsultMessageV2,
} from '@/lib/types';
import { SPECIALIST_CONFIG, Specialist } from '@/lib/types';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const isStream = request.nextUrl.searchParams.get('stream') === 'true';
  const isMultiRound = request.nextUrl.searchParams.get('multiround') === 'true';
  const maxRoundsParam = request.nextUrl.searchParams.get('maxRounds');
  const maxRounds = maxRoundsParam ? parseInt(maxRoundsParam, 10) : 3;

  const body = await request.json();

  // Support both standard and resume payloads
  const analyses = body.analyses;
  const intakeData = body.intakeData;
  const resumeFromRound: number | undefined = body.resumeFromRound;
  const userInjectedQuestions: Array<{ to: Specialist; question: string }> | undefined = body.userInjectedQuestions;

  if (!analyses || !intakeData) {
    return NextResponse.json(
      { error: 'Specialist analyses and intake data are required' },
      { status: 400 }
    );
  }

  // ─── Multi-round streaming mode ──────────────────────────────────────────────
  if (isMultiRound) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        function send(event: MultiRoundCrossConsultSSEEvent) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }

        try {
          // If resuming with user-injected questions, prepend them as cross_consults
          // so they get picked up in round 1 of the resumed session
          if (userInjectedQuestions && userInjectedQuestions.length > 0) {
            // Create a synthetic "clinician" specialist entry as cross_consults
            // by injecting them into the analyses temporarily
            for (const iq of userInjectedQuestions) {
              const targetKey = iq.to as string;
              if (analyses[targetKey]) {
                if (!Array.isArray(analyses[targetKey].cross_consults)) {
                  analyses[targetKey].cross_consults = [];
                }
                // Add as a cross-consult FROM attending TO the target specialist
                analyses[Specialist.ATTENDING] = analyses[Specialist.ATTENDING] || analyses[Object.keys(analyses)[0]];
                if (!Array.isArray(analyses[Specialist.ATTENDING].cross_consults)) {
                  analyses[Specialist.ATTENDING].cross_consults = [];
                }
                analyses[Specialist.ATTENDING].cross_consults.push({
                  to: iq.to,
                  question: iq.question,
                });
              }
            }
          }

          const effectiveMaxRounds = resumeFromRound
            ? maxRounds
            : maxRounds;

          let totalMessages = 0;
          let currentRoundMessageCount = 0;

          const rounds = await runMultiRoundCrossConsult(
            analyses,
            intakeData,
            {
              onRoundStart: (round) => {
                const displayRound = resumeFromRound ? resumeFromRound + round : round;
                currentRoundMessageCount = 0;
                send({ type: 'round_start', round: displayRound, totalRounds: effectiveMaxRounds + (resumeFromRound ?? 0) });
              },
              onMessage: (round, msg) => {
                const displayRound = resumeFromRound ? resumeFromRound + round : round;
                totalMessages++;
                currentRoundMessageCount++;
                const v2Msg: CrossConsultMessageV2 = {
                  ...msg,
                  round: displayRound,
                };
                const discussionMessage: DiscussionMessage = {
                  specialist: SPECIALIST_CONFIG[msg.to as Specialist]?.name ?? String(msg.to),
                  content: `[Round ${displayRound}] Responding to ${SPECIALIST_CONFIG[msg.from as Specialist]?.name ?? String(msg.from)}: ${msg.response?.slice(0, 200) ?? ''}`,
                  timestamp: Date.now(),
                };
                send({ type: 'cross_consult_message', message: v2Msg, discussionMessage, round: displayRound });
              },
              onRoundDone: (round, newQuestionsCount) => {
                const displayRound = resumeFromRound ? resumeFromRound + round : round;
                send({ type: 'round_done', round: displayRound, messagesInRound: currentRoundMessageCount });

                // If we hit max rounds and there are still pending questions, pause
                if (round === effectiveMaxRounds && newQuestionsCount > 0) {
                  send({
                    type: 'discussion_paused',
                    pauseState: {
                      roundsCompleted: displayRound,
                      pendingQuestions: [], // Questions are internal to orchestrator
                      canContinue: true,
                    },
                  });
                }
              },
            },
            effectiveMaxRounds
          );

          // Determine if we completed naturally (no more questions) or hit the limit
          const lastRound = rounds[rounds.length - 1];
          const hitLimit = rounds.length === effectiveMaxRounds;

          if (!hitLimit || !lastRound) {
            // Completed naturally — no more questions to ask
            send({
              type: 'all_rounds_complete',
              totalRounds: rounds.length + (resumeFromRound ?? 0),
              totalMessages,
            });
          }
          // If hitLimit, we already sent discussion_paused in the onRoundDone callback
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Failed to process multi-round cross-consultation';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: msg })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  // ─── Non-streaming mode (used by refine flow) ────────────────────────────────
  if (!isStream) {
    try {
      const messages = await runCrossConsult(analyses, intakeData);

      const discussionMessages: DiscussionMessage[] = messages.map((msg) => ({
        specialist: SPECIALIST_CONFIG[msg.to as Specialist]?.name ?? String(msg.to),
        content: `Responding to ${SPECIALIST_CONFIG[msg.from as Specialist]?.name ?? String(msg.from)}: ${msg.response?.slice(0, 200) ?? ''}`,
        timestamp: Date.now(),
      }));

      const response: CrossConsultResponse = {
        messages,
        updatedAnalyses: analyses,
        discussionMessages,
      };

      return NextResponse.json(response);
    } catch {
      return NextResponse.json(
        { error: 'Failed to process cross-consultation' },
        { status: 500 }
      );
    }
  }

  // ─── Streaming mode (used by auto-flow pipeline) ─────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: CrossConsultSSEEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        let completedCount = 0;

        const messages = await runCrossConsultStreaming(
          analyses,
          intakeData,
          (msg) => {
            completedCount++;
            const discussionMessage: DiscussionMessage = {
              specialist: SPECIALIST_CONFIG[msg.to as Specialist]?.name ?? String(msg.to),
              content: `Responding to ${SPECIALIST_CONFIG[msg.from as Specialist]?.name ?? String(msg.from)}: ${msg.response?.slice(0, 200) ?? ''}`,
              timestamp: Date.now(),
            };
            send({ type: 'cross_consult_message', message: msg, discussionMessage });
          }
        );

        send({ type: 'cross_consult_done', totalExchanges: messages.length, completedCount });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to process cross-consultation';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: msg })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
