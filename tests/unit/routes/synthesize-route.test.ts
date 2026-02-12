import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MOCK_INTAKE_DATA, createMockAnalyses, MOCK_CROSS_CONSULT_MESSAGES } from '../../fixtures/clinical-data';

// Mock the orchestrator's runSynthesis as an async generator
const mockRunSynthesis = vi.fn();

vi.mock('@/lib/orchestrator', () => ({
  runSynthesis: (...args: unknown[]) => mockRunSynthesis(...args),
}));

import { POST } from '@/app/api/synthesize/route';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/synthesize', () => {
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

  it('should stream text chunks in the response', async () => {
    const chunks = ['Problem 1: ', 'CHF exacerbation\n', 'Problem 2: ', 'AKI'];

    async function* generator() {
      for (const chunk of chunks) {
        yield chunk;
      }
    }
    mockRunSynthesis.mockReturnValueOnce(generator());

    const analyses = createMockAnalyses();
    const res = await POST(makeRequest({
      analyses,
      crossConsults: MOCK_CROSS_CONSULT_MESSAGES,
      intakeData: MOCK_INTAKE_DATA,
    }));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/plain');
    expect(res.headers.get('Cache-Control')).toBe('no-cache');

    // Read the stream
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }

    expect(fullText).toBe(chunks.join(''));
  });

  it('should call runSynthesis with analyses, crossConsults, and intakeData', async () => {
    async function* generator() {
      yield 'test';
    }
    mockRunSynthesis.mockReturnValueOnce(generator());

    const analyses = createMockAnalyses();
    const res = await POST(makeRequest({
      analyses,
      crossConsults: MOCK_CROSS_CONSULT_MESSAGES,
      intakeData: MOCK_INTAKE_DATA,
    }));

    // Consume the stream to completion
    const reader = res.body!.getReader();
    while (!(await reader.read()).done) {}

    expect(mockRunSynthesis).toHaveBeenCalledWith(
      analyses,
      MOCK_CROSS_CONSULT_MESSAGES,
      MOCK_INTAKE_DATA
    );
  });

  it('should default crossConsults to empty array when not provided', async () => {
    async function* generator() {
      yield 'test';
    }
    mockRunSynthesis.mockReturnValueOnce(generator());

    const analyses = createMockAnalyses();
    const res = await POST(makeRequest({
      analyses,
      intakeData: MOCK_INTAKE_DATA,
    }));

    const reader = res.body!.getReader();
    while (!(await reader.read()).done) {}

    expect(mockRunSynthesis).toHaveBeenCalledWith(
      analyses,
      [],
      MOCK_INTAKE_DATA
    );
  });

  it('should handle empty generator', async () => {
    async function* generator() {
      // yields nothing
    }
    mockRunSynthesis.mockReturnValueOnce(generator());

    const analyses = createMockAnalyses();
    const res = await POST(makeRequest({
      analyses,
      crossConsults: [],
      intakeData: MOCK_INTAKE_DATA,
    }));

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }

    expect(fullText).toBe('');
  });

  it('should return 500 when request body is invalid JSON', async () => {
    const req = new Request('http://localhost/api/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
