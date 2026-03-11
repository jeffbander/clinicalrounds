/**
 * E2E Test: Specialist Chat
 *
 * Tests the post-analysis focused Q&A flow where clinicians
 * chat with individual specialists and trigger cascading discussions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Specialist } from '@/lib/types';
import { MOCK_INTAKE_DATA, createMockAnalyses } from '../fixtures/clinical-data';

// ─── Mock orchestrator ──────────────────────────────────────────────────────

vi.mock('@/lib/orchestrator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/orchestrator')>();
  return {
    ...actual,
    runSpecialistChat: vi.fn(),
  };
});

// Mock Anthropic SDK (specialist-chat route instantiates it for triggered discussions)
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = function () {
    return { messages: { create: mockCreate } };
  };
  return { default: MockAnthropic };
});

import { runSpecialistChat } from '@/lib/orchestrator';
import { POST } from '@/app/api/specialist-chat/route';
import { NextRequest } from 'next/server';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeChatRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/specialist-chat', {
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

describe('E2E: Specialist Chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return chat_response and chat_done for a simple question', async () => {
    const analyses = createMockAnalyses();

    vi.mocked(runSpecialistChat).mockResolvedValueOnce({
      response: 'I recommend continuing IV diuresis with close monitoring of renal function.',
      triggeredQuestions: [],
    });

    const res = await POST(makeChatRequest({
      specialist: Specialist.CARDIOLOGIST,
      message: 'Should we increase the diuretic dose?',
      intakeData: MOCK_INTAKE_DATA,
      analyses,
    }));

    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    const events = await readSSEEvents(res);

    const chatResponse = events.find(e => e.type === 'chat_response');
    expect(chatResponse).toBeDefined();
    const msg = chatResponse!.message as any;
    expect(msg.role).toBe('specialist');
    expect(msg.specialist).toBe(Specialist.CARDIOLOGIST);
    expect(msg.content).toContain('IV diuresis');

    const doneEvent = events.find(e => e.type === 'chat_done');
    expect(doneEvent).toBeDefined();
  });

  it('should trigger cross-consult discussions when specialist raises questions', async () => {
    const analyses = createMockAnalyses();

    vi.mocked(runSpecialistChat).mockResolvedValueOnce({
      response: 'The rising creatinine is concerning. We should consult nephrology.',
      triggeredQuestions: [
        { to: Specialist.NEPHROLOGIST, question: 'Is this cardiorenal syndrome vs. true AKI?' },
      ],
    });

    // Mock the triggered cross-consult response
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'This appears to be cardiorenal syndrome based on the pattern.' }],
    });

    const res = await POST(makeChatRequest({
      specialist: Specialist.CARDIOLOGIST,
      message: 'What about the rising creatinine?',
      intakeData: MOCK_INTAKE_DATA,
      analyses,
    }));

    const events = await readSSEEvents(res);

    const chatResponse = events.find(e => e.type === 'chat_response');
    expect(chatResponse).toBeDefined();

    const triggeredEvent = events.find(e => e.type === 'chat_triggered_discussion');
    expect(triggeredEvent).toBeDefined();
    const discussions = triggeredEvent!.discussions as any[];
    expect(discussions.length).toBe(1);
    expect(discussions[0].from).toBe(Specialist.CARDIOLOGIST);
    expect(discussions[0].to).toBe(Specialist.NEPHROLOGIST);
    expect(discussions[0].response).toContain('cardiorenal syndrome');

    const doneEvent = events.find(e => e.type === 'chat_done');
    expect(doneEvent).toBeDefined();
  });

  it('should return 400 when required fields are missing', async () => {
    // Missing specialist
    const res1 = await POST(makeChatRequest({
      message: 'hello',
      intakeData: MOCK_INTAKE_DATA,
      analyses: createMockAnalyses(),
    }));
    expect(res1.status).toBe(400);

    // Missing message
    const res2 = await POST(makeChatRequest({
      specialist: Specialist.CARDIOLOGIST,
      intakeData: MOCK_INTAKE_DATA,
      analyses: createMockAnalyses(),
    }));
    expect(res2.status).toBe(400);

    // Missing intakeData
    const res3 = await POST(makeChatRequest({
      specialist: Specialist.CARDIOLOGIST,
      message: 'hello',
      analyses: createMockAnalyses(),
    }));
    expect(res3.status).toBe(400);

    // Missing analyses
    const res4 = await POST(makeChatRequest({
      specialist: Specialist.CARDIOLOGIST,
      message: 'hello',
      intakeData: MOCK_INTAKE_DATA,
    }));
    expect(res4.status).toBe(400);
  });

  it('should stream error event when orchestrator throws', async () => {
    vi.mocked(runSpecialistChat).mockRejectedValueOnce(new Error('Chat failed'));

    const res = await POST(makeChatRequest({
      specialist: Specialist.CARDIOLOGIST,
      message: 'test',
      intakeData: MOCK_INTAKE_DATA,
      analyses: createMockAnalyses(),
    }));

    const events = await readSSEEvents(res);

    const errEvent = events.find(e => e.type === 'error');
    expect(errEvent).toBeDefined();
    expect(errEvent!.error).toContain('Chat failed');
  });

  it('should pass chat history and cross consults to orchestrator', async () => {
    const analyses = createMockAnalyses();
    const chatHistory = [
      { id: '1', role: 'user' as const, specialist: Specialist.CARDIOLOGIST, content: 'Prior question', timestamp: Date.now() - 1000 },
      { id: '2', role: 'specialist' as const, specialist: Specialist.CARDIOLOGIST, content: 'Prior answer', timestamp: Date.now() - 500 },
    ];
    const crossConsults = [
      { from: Specialist.NEPHROLOGIST, to: Specialist.CARDIOLOGIST, message: 'q', response: 'a' },
    ];

    vi.mocked(runSpecialistChat).mockResolvedValueOnce({
      response: 'Follow-up response.',
      triggeredQuestions: [],
    });

    await POST(makeChatRequest({
      specialist: Specialist.CARDIOLOGIST,
      message: 'Follow-up question',
      intakeData: MOCK_INTAKE_DATA,
      analyses,
      chatHistory,
      crossConsults,
    }));

    expect(runSpecialistChat).toHaveBeenCalledWith(
      Specialist.CARDIOLOGIST,
      'Follow-up question',
      expect.objectContaining({
        intakeData: MOCK_INTAKE_DATA,
        analyses,
        crossConsults,
        chatHistory,
      })
    );
  });
});
