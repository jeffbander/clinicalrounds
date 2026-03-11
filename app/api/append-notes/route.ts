import { NextRequest } from 'next/server';
import { runIncrementalIntake, runSpecialistsStreaming } from '@/lib/orchestrator';
import type { AppendNotesRequest, DiscussionMessage, TemporalIntakeData } from '@/lib/types';
import { Specialist, SPECIALIST_CONFIG } from '@/lib/types';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const body: AppendNotesRequest = await request.json();

  if (!body.additionalNotes || body.additionalNotes.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Additional notes are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.existingIntakeData) {
    return new Response(JSON.stringify({ error: 'Existing intake data is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        // Step 1: Parse and merge new notes with existing intake
        const updatedIntake: TemporalIntakeData = await runIncrementalIntake(
          body.additionalNotes,
          body.existingIntakeData
        );
        send({ type: 'incremental_intake_complete', intakeData: updatedIntake });

        // Step 2: Re-run specialists with updated intake data
        let completedCount = 0;
        const totalSpecialists = Object.values(Specialist).length;

        await runSpecialistsStreaming(
          updatedIntake,
          (specialist, analysis) => {
            completedCount++;
            const discussionMessage: DiscussionMessage = {
              specialist: SPECIALIST_CONFIG[specialist]?.name ?? specialist,
              content: analysis.findings?.length
                ? `Updated findings: ${analysis.findings.slice(0, 3).join('; ')}`
                : 'Updated analysis complete.',
              timestamp: Date.now(),
            };
            send({ type: 'specialist_complete', specialist, analysis, discussionMessage });
          },
          (specialist, error) => {
            completedCount++;
            send({ type: 'specialist_error', specialist, error });
          }
        );

        send({ type: 'append_done', totalSpecialists, completedCount });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to process additional notes';
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
