import { NextRequest, NextResponse } from 'next/server';
import { runAdditionalData } from '@/lib/orchestrator';
import type { AdditionalDataRequest, AdditionalDataResponse, DiscussionMessage } from '@/lib/types';
import { Specialist, SPECIALIST_CONFIG } from '@/lib/types';

// Re-analysis with additional data may trigger multiple specialist calls
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body: AdditionalDataRequest = await request.json();

    if (!body.previousAnalyses || !body.intakeData) {
      return NextResponse.json(
        { error: 'Previous analyses and intake data are required' },
        { status: 400 }
      );
    }

    const updatedAnalyses = await runAdditionalData(
      body.answers,
      body.previousAnalyses,
      body.intakeData
    );

    const discussionMessages: DiscussionMessage[] = Object.entries(updatedAnalyses).map(
      ([specialist, analysis]) => ({
        specialist: SPECIALIST_CONFIG[specialist as Specialist]?.name ?? specialist,
        content: `Updated analysis with additional data. ${analysis.findings?.length ? `Key findings: ${analysis.findings.slice(0, 2).join('; ')}` : ''}`,
        timestamp: Date.now(),
      })
    );

    const response: AdditionalDataResponse = {
      updatedAnalyses,
      discussionMessages,
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process additional data' },
      { status: 500 }
    );
  }
}
