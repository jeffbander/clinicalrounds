import { runSynthesis } from '@/lib/orchestrator';
import type { SynthesizeRequest } from '@/lib/types';

// Opus synthesis can be slow
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body: SynthesizeRequest = await request.json();

    if (!body.analyses || !body.intakeData) {
      return new Response(
        JSON.stringify({ error: 'Specialist analyses and intake data are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Stream the synthesis response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of runSynthesis(
            body.analyses,
            body.crossConsults ?? [],
            body.intakeData
          )) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to synthesize plan' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
