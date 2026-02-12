import { NextRequest } from 'next/server';
import { runIntake, runSpecialistsStreaming } from '@/lib/orchestrator';
import type { AnalyzeRequest, AnalyzeSSEEvent, DiscussionMessage } from '@/lib/types';
import { Specialist, SPECIALIST_CONFIG } from '@/lib/types';

// 9 parallel specialist Claude calls need extended timeout
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const body: AnalyzeRequest = await request.json();

  if (!body.rawNotes || body.rawNotes.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Clinical notes are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: AnalyzeSSEEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        // Step 1: Parse raw notes into structured intake data
        const intakeData = await runIntake(body.rawNotes);
        send({ type: 'intake_complete', intakeData });

        // Step 2: Run all specialists in parallel, streaming results
        let completedCount = 0;
        const totalSpecialists = Object.values(Specialist).length;

        await runSpecialistsStreaming(
          intakeData,
          (specialist, analysis) => {
            completedCount++;
            const discussionMessage: DiscussionMessage = {
              specialist: SPECIALIST_CONFIG[specialist]?.name ?? specialist,
              content: analysis.findings?.length
                ? `Key findings: ${analysis.findings.slice(0, 3).join('; ')}`
                : 'Analysis complete.',
              timestamp: Date.now(),
            };
            send({ type: 'specialist_complete', specialist, analysis, discussionMessage });
          },
          (specialist, error) => {
            completedCount++;
            send({ type: 'specialist_error', specialist, error });
          }
        );

        send({ type: 'analyze_done', totalSpecialists, completedCount });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to analyze clinical notes';
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
