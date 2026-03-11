/**
 * E2E Test: Append Notes / Temporal Data
 *
 * Tests the append-notes API route which processes additional clinical notes,
 * merges them with existing intake data, and re-runs specialist analysis.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Specialist } from '@/lib/types';
import type { TemporalIntakeData } from '@/lib/types';
import {
  MOCK_INTAKE_DATA,
  createMockAnalyses,
  createMockSpecialistAnalysis,
} from '../fixtures/clinical-data';
import {
  SEPSIS_INTAKE_RESPONSE,
  APPENDED_INTAKE_RESPONSE,
  APPENDED_PROGRESS_NOTE,
} from '../fixtures/fake-cases';

// ─── Mock orchestrator ──────────────────────────────────────────────────────

vi.mock('@/lib/orchestrator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/orchestrator')>();
  return {
    ...actual,
    runIncrementalIntake: vi.fn(),
    runSpecialistsStreaming: vi.fn(),
  };
});

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = function () {
    return { messages: { create: vi.fn() } };
  };
  return { default: MockAnthropic };
});

import { runIncrementalIntake, runSpecialistsStreaming } from '@/lib/orchestrator';
import { POST } from '@/app/api/append-notes/route';
import { NextRequest } from 'next/server';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeAppendRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/append-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
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

describe('E2E: Append Notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should merge new notes and re-run specialists', async () => {
    const updatedIntake: TemporalIntakeData = JSON.parse(APPENDED_INTAKE_RESPONSE);

    vi.mocked(runIncrementalIntake).mockResolvedValueOnce(updatedIntake);

    vi.mocked(runSpecialistsStreaming).mockImplementationOnce(
      async (intakeData, onResult, onError) => {
        for (const s of Object.values(Specialist)) {
          onResult(s, createMockSpecialistAnalysis(s));
        }
        return createMockAnalyses();
      }
    );

    const res = await POST(makeAppendRequest({
      additionalNotes: APPENDED_PROGRESS_NOTE,
      existingIntakeData: JSON.parse(SEPSIS_INTAKE_RESPONSE),
    }));

    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    const events = await readSSEEvents(res);

    // Should emit incremental_intake_complete
    const intakeEvent = events.find(e => e.type === 'incremental_intake_complete');
    expect(intakeEvent).toBeDefined();
    expect((intakeEvent!.intakeData as any).encounters.length).toBe(4);

    // Should emit specialist_complete for each specialist
    const specialistEvents = events.filter(e => e.type === 'specialist_complete');
    expect(specialistEvents.length).toBe(Object.values(Specialist).length);

    // Should emit append_done
    const doneEvent = events.find(e => e.type === 'append_done');
    expect(doneEvent).toBeDefined();
    expect(doneEvent!.totalSpecialists).toBe(Object.values(Specialist).length);
  });

  it('should handle specialist errors during re-analysis', async () => {
    const updatedIntake: TemporalIntakeData = JSON.parse(APPENDED_INTAKE_RESPONSE);

    vi.mocked(runIncrementalIntake).mockResolvedValueOnce(updatedIntake);

    vi.mocked(runSpecialistsStreaming).mockImplementationOnce(
      async (intakeData, onResult, onError) => {
        let count = 0;
        for (const s of Object.values(Specialist)) {
          if (count < 3) {
            onError(s, 'API timeout');
          } else {
            onResult(s, createMockSpecialistAnalysis(s));
          }
          count++;
        }
        return createMockAnalyses();
      }
    );

    const res = await POST(makeAppendRequest({
      additionalNotes: APPENDED_PROGRESS_NOTE,
      existingIntakeData: JSON.parse(SEPSIS_INTAKE_RESPONSE),
    }));

    const events = await readSSEEvents(res);

    const successEvents = events.filter(e => e.type === 'specialist_complete');
    const errorEvents = events.filter(e => e.type === 'specialist_error');
    expect(successEvents.length).toBeGreaterThan(0);
    expect(errorEvents.length).toBe(3);

    // Pipeline should still complete
    const doneEvent = events.find(e => e.type === 'append_done');
    expect(doneEvent).toBeDefined();
  });

  it('should return 400 when additionalNotes is empty', async () => {
    const res = await POST(makeAppendRequest({
      additionalNotes: '',
      existingIntakeData: MOCK_INTAKE_DATA,
    }));
    expect(res.status).toBe(400);
  });

  it('should return 400 when additionalNotes is whitespace only', async () => {
    const res = await POST(makeAppendRequest({
      additionalNotes: '   \n  ',
      existingIntakeData: MOCK_INTAKE_DATA,
    }));
    expect(res.status).toBe(400);
  });

  it('should return 400 when existingIntakeData is missing', async () => {
    const res = await POST(makeAppendRequest({
      additionalNotes: 'New lab results: K 4.2, Cr 1.8',
    }));
    expect(res.status).toBe(400);
  });

  it('should stream error event when incremental intake fails', async () => {
    vi.mocked(runIncrementalIntake).mockRejectedValueOnce(
      new Error('Failed to parse additional notes')
    );

    const res = await POST(makeAppendRequest({
      additionalNotes: 'garbage data',
      existingIntakeData: MOCK_INTAKE_DATA,
    }));

    const events = await readSSEEvents(res);

    const errEvent = events.find(e => e.type === 'error');
    expect(errEvent).toBeDefined();
    expect(errEvent!.error).toContain('Failed to parse additional notes');
  });
});
