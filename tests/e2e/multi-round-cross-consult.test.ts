/**
 * E2E Test: Multi-Round Cross-Consult
 *
 * Tests the multi-round discussion flow with human-in-the-loop steering.
 * Uses mocked orchestrator functions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Specialist } from '@/lib/types';
import type { CrossConsultMessage, CrossConsultRound } from '@/lib/types';
import { MOCK_INTAKE_DATA, createMockAnalyses } from '../fixtures/clinical-data';

// ─── Mock orchestrator ──────────────────────────────────────────────────────

vi.mock('@/lib/orchestrator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/orchestrator')>();
  return {
    ...actual,
    runCrossConsult: vi.fn(),
    runCrossConsultStreaming: vi.fn(),
    runMultiRoundCrossConsult: vi.fn(),
  };
});

// Mock Anthropic SDK (needed because route imports it)
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = function () {
    return { messages: { create: mockCreate } };
  };
  return { default: MockAnthropic };
});

import { runMultiRoundCrossConsult } from '@/lib/orchestrator';
import { POST } from '@/app/api/cross-consult/route';
import { NextRequest } from 'next/server';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeMultiRoundRequest(body: Record<string, unknown>, maxRounds = 3) {
  return new NextRequest(
    `http://localhost/api/cross-consult?stream=true&multiround=true&maxRounds=${maxRounds}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
}

async function readSSEEvents(res: Response): Promise<Array<Record<string, unknown>>> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  const events: Array<Record<string, unknown>> = [];
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        try { events.push(JSON.parse(trimmed.slice(6))); } catch { /* skip */ }
      }
    }
  }
  if (buffer.trim().startsWith('data: ')) {
    try { events.push(JSON.parse(buffer.trim().slice(6))); } catch { /* skip */ }
  }
  return events;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('E2E: Multi-Round Cross-Consult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should stream round_start and cross_consult_message events', async () => {
    const analyses = createMockAnalyses({ withCrossConsults: true });

    vi.mocked(runMultiRoundCrossConsult).mockImplementationOnce(
      async (analysesArg, intakeData, callbacks, maxRounds) => {
        callbacks.onRoundStart(1);
        callbacks.onMessage(1, {
          from: Specialist.NEPHROLOGIST,
          to: Specialist.CARDIOLOGIST,
          message: 'Should we hold ACEi given AKI?',
          response: 'Reduce dose rather than holding.',
        });
        callbacks.onRoundDone(1, 0); // No new questions → natural completion
        return [{
          round: 1,
          messages: [{
            from: Specialist.NEPHROLOGIST,
            to: Specialist.CARDIOLOGIST,
            message: 'Should we hold ACEi given AKI?',
            response: 'Reduce dose rather than holding.',
          }],
        }];
      }
    );

    const res = await POST(makeMultiRoundRequest({ analyses, intakeData: MOCK_INTAKE_DATA }));
    const events = await readSSEEvents(res);

    const roundStart = events.find(e => e.type === 'round_start');
    expect(roundStart).toBeDefined();
    expect(roundStart!.round).toBe(1);

    const ccMsg = events.find(e => e.type === 'cross_consult_message');
    expect(ccMsg).toBeDefined();
    expect((ccMsg!.message as any).from).toBe(Specialist.NEPHROLOGIST);
    expect((ccMsg!.message as any).to).toBe(Specialist.CARDIOLOGIST);

    const done = events.find(e => e.type === 'all_rounds_complete');
    expect(done).toBeDefined();
    expect(done!.totalMessages).toBe(1);
  });

  it('should emit discussion_paused when hitting max rounds with pending questions', async () => {
    const analyses = createMockAnalyses({ withCrossConsults: true });

    vi.mocked(runMultiRoundCrossConsult).mockImplementationOnce(
      async (analysesArg, intakeData, callbacks, maxRounds) => {
        // Simulate 3 rounds with new questions each time
        for (let r = 1; r <= maxRounds!; r++) {
          callbacks.onRoundStart(r);
          callbacks.onMessage(r, {
            from: Specialist.NEPHROLOGIST,
            to: Specialist.CARDIOLOGIST,
            message: `Round ${r} question`,
            response: `Round ${r} response`,
          });
          // Last round has pending questions → triggers pause
          callbacks.onRoundDone(r, r === maxRounds! ? 2 : 1);
        }
        return Array.from({ length: maxRounds! }, (_, i) => ({
          round: i + 1,
          messages: [{
            from: Specialist.NEPHROLOGIST,
            to: Specialist.CARDIOLOGIST,
            message: `Round ${i + 1} question`,
            response: `Round ${i + 1} response`,
          }],
        }));
      }
    );

    const res = await POST(makeMultiRoundRequest({ analyses, intakeData: MOCK_INTAKE_DATA }, 3));
    const events = await readSSEEvents(res);

    const roundStarts = events.filter(e => e.type === 'round_start');
    expect(roundStarts.length).toBe(3);

    const pauseEvent = events.find(e => e.type === 'discussion_paused');
    expect(pauseEvent).toBeDefined();
    expect((pauseEvent!.pauseState as any).canContinue).toBe(true);

    // Should NOT have all_rounds_complete since we paused
    const completeEvent = events.find(e => e.type === 'all_rounds_complete');
    expect(completeEvent).toBeUndefined();
  });

  it('should support resuming from a previous round with user-injected questions', async () => {
    const analyses = createMockAnalyses({ withCrossConsults: true });

    vi.mocked(runMultiRoundCrossConsult).mockImplementationOnce(
      async (analysesArg, intakeData, callbacks, maxRounds) => {
        callbacks.onRoundStart(1);
        callbacks.onMessage(1, {
          from: Specialist.ATTENDING,
          to: Specialist.PHARMACIST,
          message: 'What about renal dosing?',
          response: 'Adjust based on GFR.',
        });
        callbacks.onRoundDone(1, 0);
        return [{
          round: 1,
          messages: [{
            from: Specialist.ATTENDING,
            to: Specialist.PHARMACIST,
            message: 'What about renal dosing?',
            response: 'Adjust based on GFR.',
          }],
        }];
      }
    );

    const res = await POST(makeMultiRoundRequest({
      analyses,
      intakeData: MOCK_INTAKE_DATA,
      resumeFromRound: 3,
      userInjectedQuestions: [
        { to: Specialist.PHARMACIST, question: 'What about renal dosing?' },
      ],
    }, 2));

    const events = await readSSEEvents(res);

    // Round should be offset by resumeFromRound
    const roundStart = events.find(e => e.type === 'round_start');
    expect(roundStart).toBeDefined();
    expect(roundStart!.round).toBe(4); // resumeFromRound(3) + 1

    const ccMsg = events.find(e => e.type === 'cross_consult_message');
    expect(ccMsg).toBeDefined();
    expect(ccMsg!.round).toBe(4);
  });

  it('should return 400 when analyses missing in multi-round mode', async () => {
    const res = await POST(makeMultiRoundRequest({ intakeData: MOCK_INTAKE_DATA }));
    expect(res.status).toBe(400);
  });

  it('should stream error event when orchestrator throws', async () => {
    const analyses = createMockAnalyses();

    vi.mocked(runMultiRoundCrossConsult).mockRejectedValueOnce(
      new Error('Orchestrator blew up')
    );

    const res = await POST(makeMultiRoundRequest({ analyses, intakeData: MOCK_INTAKE_DATA }));
    const events = await readSSEEvents(res);

    const errEvent = events.find(e => e.type === 'error');
    expect(errEvent).toBeDefined();
    expect(errEvent!.error).toContain('Orchestrator blew up');
  });
});
