import { NextRequest } from 'next/server';
import { runSpecialistChat } from '@/lib/orchestrator';
import type { SpecialistChatRequest, SpecialistChatSSEEvent, SpecialistChatMessage, CrossConsultMessage } from '@/lib/types';
import { Specialist, SPECIALIST_CONFIG } from '@/lib/types';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  const body: SpecialistChatRequest = await request.json();

  if (!body.specialist || !body.message || !body.intakeData || !body.analyses) {
    return new Response(JSON.stringify({ error: 'specialist, message, intakeData, and analyses are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: SpecialistChatSSEEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        // Run the specialist chat
        const result = await runSpecialistChat(
          body.specialist,
          body.message,
          {
            intakeData: body.intakeData,
            analyses: body.analyses,
            crossConsults: body.crossConsults ?? [],
            chatHistory: body.chatHistory ?? [],
            synthesizedPlan: '',
          }
        );

        // Send the specialist's response
        const responseMessage: SpecialistChatMessage = {
          id: Math.random().toString(36).substring(2, 10),
          role: 'specialist',
          specialist: body.specialist,
          content: result.response,
          timestamp: Date.now(),
        };

        send({ type: 'chat_response', message: responseMessage });

        // If there are triggered questions, run a mini cross-consult round
        if (result.triggeredQuestions.length > 0) {
          const triggeredDiscussions: CrossConsultMessage[] = [];

          await Promise.allSettled(
            result.triggeredQuestions.map(async (tq) => {
              const targetSpecialist = tq.to as Specialist;
              const targetAnalysis = body.analyses[targetSpecialist];
              if (!targetAnalysis) return;

              const SONNET_MODEL = 'claude-sonnet-4-5-20250929';

              const response = await anthropic.messages.create({
                model: SONNET_MODEL,
                max_tokens: 2048,
                messages: [{
                  role: 'user',
                  content: `A colleague in ${SPECIALIST_CONFIG[body.specialist]?.name ?? body.specialist} asks during a follow-up discussion: "${tq.question}"

Your previous analysis: ${JSON.stringify(targetAnalysis)}

Patient data summary:
Demographics: ${JSON.stringify(body.intakeData.demographics)}
Chief Complaint: ${body.intakeData.chief_complaint}

Respond to their question concisely.`,
                }],
              });

              const text = response.content[0].type === 'text' ? response.content[0].text : '';
              const ccMsg: CrossConsultMessage = {
                from: body.specialist,
                to: targetSpecialist,
                message: tq.question,
                response: text,
              };
              triggeredDiscussions.push(ccMsg);
            })
          );

          if (triggeredDiscussions.length > 0) {
            // Attach triggered discussions to the response message
            responseMessage.triggered_discussions = triggeredDiscussions;
            send({ type: 'chat_triggered_discussion', discussions: triggeredDiscussions });
          }
        }

        send({ type: 'chat_done' });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to process specialist chat';
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
