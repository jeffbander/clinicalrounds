import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MOCK_INTAKE_DATA, createMockAnalyses, MOCK_DISCUSSION_MESSAGES } from '../../fixtures/clinical-data';
import { Specialist, SPECIALIST_CONFIG } from '@/lib/types';

// Mock the orchestrator
vi.mock('@/lib/orchestrator', () => ({
  runIntake: vi.fn(),
  runSpecialistsStreaming: vi.fn(),
}));

import { runIntake, runSpecialistsStreaming } from '@/lib/orchestrator';
import { POST } from '@/app/api/analyze/route';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

/** Helper to read all SSE events from a streaming response */
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
        try {
          events.push(JSON.parse(trimmed.slice(6)));
        } catch { /* skip */ }
      }
    }
  }

  if (buffer.trim().startsWith('data: ')) {
    try { events.push(JSON.parse(buffer.trim().slice(6))); } catch { /* skip */ }
  }

  return events;
}

describe('POST /api/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when rawNotes is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('should return 400 when rawNotes is empty string', async () => {
    const res = await POST(makeRequest({ rawNotes: '   ' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('should call runIntake then runSpecialistsStreaming', async () => {
    const mockAnalyses = createMockAnalyses();
    vi.mocked(runIntake).mockResolvedValueOnce(MOCK_INTAKE_DATA);
    vi.mocked(runSpecialistsStreaming).mockImplementationOnce(async (intakeData, onResult, onError) => {
      for (const [specialist, analysis] of Object.entries(mockAnalyses)) {
        onResult(specialist as any, analysis);
      }
      return mockAnalyses;
    });

    const res = await POST(makeRequest({ rawNotes: 'Patient presents with...' }));

    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(runIntake).toHaveBeenCalledWith('Patient presents with...');
    expect(runSpecialistsStreaming).toHaveBeenCalled();
  });

  it('should emit intake_complete, specialist_complete, and analyze_done events', async () => {
    const mockAnalyses = createMockAnalyses();
    vi.mocked(runIntake).mockResolvedValueOnce(MOCK_INTAKE_DATA);
    vi.mocked(runSpecialistsStreaming).mockImplementationOnce(async (intakeData, onResult, onError) => {
      for (const [specialist, analysis] of Object.entries(mockAnalyses)) {
        onResult(specialist as any, analysis);
      }
      return mockAnalyses;
    });

    const res = await POST(makeRequest({ rawNotes: 'Patient notes' }));
    const events = await readSSEEvents(res);

    const types = events.map((e) => e.type);
    expect(types[0]).toBe('intake_complete');
    expect(types.filter((t) => t === 'specialist_complete').length).toBe(Object.keys(mockAnalyses).length);
    expect(types[types.length - 1]).toBe('analyze_done');
  });

  it('should include discussion messages with each specialist_complete event', async () => {
    const mockAnalyses = createMockAnalyses();
    vi.mocked(runIntake).mockResolvedValueOnce(MOCK_INTAKE_DATA);
    vi.mocked(runSpecialistsStreaming).mockImplementationOnce(async (intakeData, onResult, onError) => {
      for (const [specialist, analysis] of Object.entries(mockAnalyses)) {
        onResult(specialist as any, analysis);
      }
      return mockAnalyses;
    });

    const res = await POST(makeRequest({ rawNotes: 'Notes' }));
    const events = await readSSEEvents(res);

    const specialistEvents = events.filter((e) => e.type === 'specialist_complete');
    for (const event of specialistEvents) {
      const msg = event.discussionMessage as Record<string, unknown>;
      expect(msg.specialist).toBeDefined();
      expect(msg.content).toBeDefined();
      expect(msg.timestamp).toBeDefined();
    }
  });

  it('should emit error event when orchestrator throws', async () => {
    vi.mocked(runIntake).mockRejectedValueOnce(new Error('API failure'));

    const res = await POST(makeRequest({ rawNotes: 'Notes' }));
    const events = await readSSEEvents(res);

    const errorEvent = events.find((e) => e.type === 'error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.error).toContain('API failure');
  });

  it('should use specialist display names in discussion messages', async () => {
    const mockAnalyses = createMockAnalyses();
    vi.mocked(runIntake).mockResolvedValueOnce(MOCK_INTAKE_DATA);
    vi.mocked(runSpecialistsStreaming).mockImplementationOnce(async (intakeData, onResult, onError) => {
      for (const [specialist, analysis] of Object.entries(mockAnalyses)) {
        onResult(specialist as any, analysis);
      }
      return mockAnalyses;
    });

    const res = await POST(makeRequest({ rawNotes: 'Notes' }));
    const events = await readSSEEvents(res);

    const validNames = Object.values(SPECIALIST_CONFIG).map((c) => c.name);
    const specialistEvents = events.filter((e) => e.type === 'specialist_complete');
    for (const event of specialistEvents) {
      const msg = event.discussionMessage as Record<string, unknown>;
      expect(validNames).toContain(msg.specialist);
    }
  });

  it('should limit findings summary to 3 items', async () => {
    const mockAnalyses = createMockAnalyses();
    const attending = mockAnalyses[Specialist.ATTENDING];
    attending.findings = ['F1', 'F2', 'F3', 'F4', 'F5'];

    vi.mocked(runIntake).mockResolvedValueOnce(MOCK_INTAKE_DATA);
    vi.mocked(runSpecialistsStreaming).mockImplementationOnce(async (intakeData, onResult, onError) => {
      for (const [specialist, analysis] of Object.entries(mockAnalyses)) {
        onResult(specialist as any, analysis);
      }
      return mockAnalyses;
    });

    const res = await POST(makeRequest({ rawNotes: 'Notes' }));
    const events = await readSSEEvents(res);

    const attendingEvent = events.find(
      (e) => e.type === 'specialist_complete' && e.specialist === Specialist.ATTENDING
    );
    const msg = attendingEvent!.discussionMessage as Record<string, unknown>;
    expect(msg.content as string).toContain('F1');
    expect(msg.content as string).toContain('F3');
    expect(msg.content as string).not.toContain('F4');
  });
});
