import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MOCK_INTAKE_DATA, createMockAnalyses } from '../../fixtures/clinical-data';
import { Specialist, SPECIALIST_CONFIG } from '@/lib/types';

vi.mock('@/lib/orchestrator', () => ({
  runAdditionalData: vi.fn(),
}));

import { runAdditionalData } from '@/lib/orchestrator';
import { POST } from '@/app/api/additional-data/route';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/additional-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

describe('POST /api/additional-data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when previousAnalyses is missing', async () => {
    const res = await POST(makeRequest({ intakeData: MOCK_INTAKE_DATA, answers: {} }));
    expect(res.status).toBe(400);
  });

  it('should return 400 when intakeData is missing', async () => {
    const res = await POST(makeRequest({ previousAnalyses: createMockAnalyses(), answers: {} }));
    expect(res.status).toBe(400);
  });

  it('should call runAdditionalData with correct params', async () => {
    const analyses = createMockAnalyses();
    const answers = { q1: 'Yes', q2: null };

    vi.mocked(runAdditionalData).mockResolvedValueOnce(analyses);

    const res = await POST(makeRequest({
      answers,
      previousAnalyses: analyses,
      intakeData: MOCK_INTAKE_DATA,
    }));

    expect(res.status).toBe(200);
    expect(runAdditionalData).toHaveBeenCalledWith(answers, analyses, MOCK_INTAKE_DATA);
  });

  it('should return updatedAnalyses and discussionMessages', async () => {
    const analyses = createMockAnalyses();
    vi.mocked(runAdditionalData).mockResolvedValueOnce(analyses);

    const res = await POST(makeRequest({
      answers: { q1: 'Answer' },
      previousAnalyses: analyses,
      intakeData: MOCK_INTAKE_DATA,
    }));
    const data = await res.json();

    expect(data.updatedAnalyses).toBeDefined();
    expect(data.discussionMessages).toBeDefined();
    expect(Array.isArray(data.discussionMessages)).toBe(true);
  });

  it('should build discussion messages from updated analyses', async () => {
    const analyses = createMockAnalyses();
    vi.mocked(runAdditionalData).mockResolvedValueOnce(analyses);

    const res = await POST(makeRequest({
      answers: { q1: 'Yes' },
      previousAnalyses: analyses,
      intakeData: MOCK_INTAKE_DATA,
    }));
    const data = await res.json();

    expect(data.discussionMessages.length).toBe(Object.keys(analyses).length);
    for (const msg of data.discussionMessages) {
      expect(msg.content).toContain('Updated analysis with additional data');
    }
  });

  it('should return 500 when orchestrator throws', async () => {
    vi.mocked(runAdditionalData).mockRejectedValueOnce(new Error('fail'));

    const res = await POST(makeRequest({
      answers: { q1: 'Answer' },
      previousAnalyses: createMockAnalyses(),
      intakeData: MOCK_INTAKE_DATA,
    }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain('Failed to process additional data');
  });

  it('should include findings summary in discussion when available', async () => {
    const analyses = createMockAnalyses();
    vi.mocked(runAdditionalData).mockResolvedValueOnce(analyses);

    const res = await POST(makeRequest({
      answers: { q1: 'Answer' },
      previousAnalyses: analyses,
      intakeData: MOCK_INTAKE_DATA,
    }));
    const data = await res.json();

    // Messages should mention findings
    const msgWithFindings = data.discussionMessages.find(
      (m: { content: string }) => m.content.includes('Key findings')
    );
    expect(msgWithFindings).toBeDefined();
  });
});
