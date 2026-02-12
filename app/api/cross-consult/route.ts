import { NextRequest, NextResponse } from 'next/server';
import { runCrossConsult, runCrossConsultStreaming } from '@/lib/orchestrator';
import type { CrossConsultApiRequest, CrossConsultResponse, CrossConsultSSEEvent, DiscussionMessage } from '@/lib/types';
import { SPECIALIST_CONFIG, Specialist } from '@/lib/types';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const isStream = request.nextUrl.searchParams.get('stream') === 'true';
  const body: CrossConsultApiRequest = await request.json();

  if (!body.analyses || !body.intakeData) {
    return NextResponse.json(
      { error: 'Specialist analyses and intake data are required' },
      { status: 400 }
    );
  }

  // Non-streaming mode (used by refine flow)
  if (!isStream) {
    try {
      const messages = await runCrossConsult(body.analyses, body.intakeData);

      const discussionMessages: DiscussionMessage[] = messages.map((msg) => ({
        specialist: SPECIALIST_CONFIG[msg.to as Specialist]?.name ?? String(msg.to),
        content: `Responding to ${SPECIALIST_CONFIG[msg.from as Specialist]?.name ?? String(msg.from)}: ${msg.response?.slice(0, 200) ?? ''}`,
        timestamp: Date.now(),
      }));

      const response: CrossConsultResponse = {
        messages,
        updatedAnalyses: body.analyses,
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

  // Streaming mode (used by auto-flow pipeline)
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: CrossConsultSSEEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        let completedCount = 0;

        const messages = await runCrossConsultStreaming(
          body.analyses,
          body.intakeData,
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
