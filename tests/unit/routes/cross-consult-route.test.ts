import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MOCK_INTAKE_DATA, createMockAnalyses, MOCK_CROSS_CONSULT_MESSAGES } from '../../fixtures/clinical-data';
import { Specialist, SPECIALIST_CONFIG } from '@/lib/types';
import { NextRequest } from 'next/server';

vi.mock('@/lib/orchestrator', () => ({
  runCrossConsult: vi.fn(),
  runCrossConsultStreaming: vi.fn(),
}));

import { runCrossConsult } from '@/lib/orchestrator';
import { POST } from '@/app/api/cross-consult/route';

function makeRequest(body: unknown, stream = false) {
  const url = stream
    ? 'http://localhost/api/cross-consult?stream=true'
    : 'http://localhost/api/cross-consult';
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/cross-consult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when analyses is missing', async () => {
    const res = await POST(makeRequest({ intakeData: MOCK_INTAKE_DATA }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('should return 400 when intakeData is missing', async () => {
    const res = await POST(makeRequest({ analyses: createMockAnalyses() }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('should call runCrossConsult with analyses and intakeData', async () => {
    const analyses = createMockAnalyses();
    vi.mocked(runCrossConsult).mockResolvedValueOnce(MOCK_CROSS_CONSULT_MESSAGES);

    const res = await POST(makeRequest({ analyses, intakeData: MOCK_INTAKE_DATA }));

    expect(res.status).toBe(200);
    expect(runCrossConsult).toHaveBeenCalledWith(analyses, MOCK_INTAKE_DATA);
  });

  it('should return messages, updatedAnalyses, and discussionMessages', async () => {
    const analyses = createMockAnalyses();
    vi.mocked(runCrossConsult).mockResolvedValueOnce(MOCK_CROSS_CONSULT_MESSAGES);

    const res = await POST(makeRequest({ analyses, intakeData: MOCK_INTAKE_DATA }));
    const data = await res.json();

    expect(data.messages).toBeDefined();
    expect(data.updatedAnalyses).toBeDefined();
    expect(data.discussionMessages).toBeDefined();
  });

  it('should pass through analyses as updatedAnalyses', async () => {
    const analyses = createMockAnalyses();
    vi.mocked(runCrossConsult).mockResolvedValueOnce(MOCK_CROSS_CONSULT_MESSAGES);

    const res = await POST(makeRequest({ analyses, intakeData: MOCK_INTAKE_DATA }));
    const data = await res.json();

    expect(data.updatedAnalyses).toEqual(analyses);
  });

  it('should truncate cross-consult response to 200 chars in discussion', async () => {
    const longResponse = 'A'.repeat(300);
    vi.mocked(runCrossConsult).mockResolvedValueOnce([{
      from: Specialist.NEPHROLOGIST,
      to: Specialist.CARDIOLOGIST,
      message: 'Question?',
      response: longResponse,
    }]);

    const analyses = createMockAnalyses();
    const res = await POST(makeRequest({ analyses, intakeData: MOCK_INTAKE_DATA }));
    const data = await res.json();

    const msg = data.discussionMessages[0];
    expect(msg.content.length).toBeLessThan(longResponse.length);
  });

  it('should return 500 when orchestrator throws', async () => {
    vi.mocked(runCrossConsult).mockRejectedValueOnce(new Error('API failure'));

    const analyses = createMockAnalyses();
    const res = await POST(makeRequest({ analyses, intakeData: MOCK_INTAKE_DATA }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain('Failed to process cross-consultation');
  });

  it('should handle empty cross-consult messages', async () => {
    vi.mocked(runCrossConsult).mockResolvedValueOnce([]);

    const analyses = createMockAnalyses();
    const res = await POST(makeRequest({ analyses, intakeData: MOCK_INTAKE_DATA }));
    const data = await res.json();

    expect(data.messages).toEqual([]);
    expect(data.discussionMessages).toEqual([]);
  });
});
