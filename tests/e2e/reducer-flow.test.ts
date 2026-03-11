/**
 * E2E Test: Reducer State Flow
 *
 * Tests the full state machine transitions through the reducer:
 * idle → parsing → analyzing → cross_consulting → discussion_paused → synthesizing → complete → chatting
 */
import { describe, it, expect } from 'vitest';
import { Specialist } from '@/lib/types';
import type { CrossConsultMessage, SpecialistChatMessage } from '@/lib/types';
import { caseReducer, initialState } from '@/lib/reducer';
import {
  MOCK_INTAKE_DATA,
  createMockAnalyses,
  createMockSpecialistAnalysis,
} from '../fixtures/clinical-data';

describe('E2E: Reducer Full Flow', () => {
  it('should transition through the complete pipeline: idle → complete', () => {
    let state = initialState;

    // 1. Start analysis
    state = caseReducer(state, { type: 'START_ANALYSIS', rawNotes: 'Patient notes...' });
    expect(state.step).toBe('parsing');
    expect(state.rawNotes).toBe('Patient notes...');

    // 2. Intake complete (does not change step by itself)
    state = caseReducer(state, {
      type: 'INTAKE_COMPLETE',
      intakeData: MOCK_INTAKE_DATA,
    });
    expect(state.intakeData).toBe(MOCK_INTAKE_DATA);

    // 3. Set analyzing with statuses
    const statuses: Record<string, any> = {};
    for (const s of Object.values(Specialist)) {
      statuses[s] = 'waiting';
    }
    state = caseReducer(state, { type: 'SET_ANALYZING', statuses });
    expect(state.step).toBe('analyzing');

    // 4. Specialist results come in
    for (const s of Object.values(Specialist)) {
      state = caseReducer(state, {
        type: 'SPECIALIST_COMPLETE',
        specialist: s,
        analysis: createMockSpecialistAnalysis(s, { hasCrossConsults: s === Specialist.NEPHROLOGIST }),
        discussionMessage: { specialist: s, content: `Findings from ${s}`, timestamp: Date.now() },
      });
    }
    expect(Object.keys(state.specialistAnalyses).length).toBe(Object.values(Specialist).length);

    // 5. Analysis done → cross consulting starts
    state = caseReducer(state, { type: 'ANALYZE_DONE' });
    expect(state.step).toBe('cross_consulting');

    // 5. Multi-round cross-consult: round starts
    state = caseReducer(state, {
      type: 'CROSS_CONSULT_ROUND_START',
      round: 1,
      totalRounds: 3,
    });
    expect(state.currentRound).toBe(1);

    // 6. Cross-consult messages come in
    const ccMsg: CrossConsultMessage = {
      from: Specialist.NEPHROLOGIST,
      to: Specialist.CARDIOLOGIST,
      message: 'Hold ACEi?',
      response: 'Reduce dose.',
    };
    state = caseReducer(state, {
      type: 'CROSS_CONSULT_ROUND_MESSAGE',
      message: { ...ccMsg, round: 1 },
      discussionMessage: { specialist: 'Cardiology', content: 'Responding...', timestamp: Date.now() },
      round: 1,
    });
    expect(state.crossConsultMessages.length).toBe(1);
    expect(state.crossConsultRounds.length).toBe(1);

    // 7. Round done
    state = caseReducer(state, {
      type: 'CROSS_CONSULT_ROUND_DONE',
      round: 1,
      messagesInRound: 1,
    });

    // 8. Discussion paused (hit max rounds with pending questions)
    state = caseReducer(state, {
      type: 'DISCUSSION_PAUSED',
      pauseState: { roundsCompleted: 3, pendingQuestions: [], canContinue: true },
    });
    expect(state.step).toBe('discussion_paused');

    // 9. User steers: continue for more rounds
    state = caseReducer(state, {
      type: 'USER_STEERING_ACTION',
      action: { type: 'continue', additionalRounds: 2 },
    });
    expect(state.step).toBe('cross_consulting');

    // 10. Simulate more round then all complete
    state = caseReducer(state, {
      type: 'ALL_ROUNDS_COMPLETE',
      totalRounds: 4,
      totalMessages: 5,
    });
    expect(state.step).toBe('synthesizing');

    // 11. Set synthesizing (sets isStreaming)
    state = caseReducer(state, { type: 'SET_SYNTHESIZING' });
    expect(state.isStreaming).toBe(true);

    // 12. Synthesis streaming
    state = caseReducer(state, { type: 'STREAM_SYNTHESIS', chunk: 'Problem 1: ' });
    expect(state.synthesizedPlan).toBe('Problem 1: ');

    state = caseReducer(state, { type: 'STREAM_SYNTHESIS', chunk: 'CHF Exacerbation\n' });
    expect(state.synthesizedPlan).toBe('Problem 1: CHF Exacerbation\n');

    // 12. Synthesis complete
    state = caseReducer(state, { type: 'SYNTHESIS_COMPLETE' });
    expect(state.step).toBe('complete');
    expect(state.isStreaming).toBe(false);
  });

  it('should transition from complete to chatting', () => {
    let state = initialState;

    // Fast-forward to complete
    state = caseReducer(state, { type: 'START_ANALYSIS', rawNotes: 'notes' });
    state = caseReducer(state, { type: 'INTAKE_COMPLETE', intakeData: MOCK_INTAKE_DATA });
    for (const s of Object.values(Specialist)) {
      state = caseReducer(state, {
        type: 'SPECIALIST_RESULT',
        specialist: s,
        analysis: createMockSpecialistAnalysis(s),
      });
    }
    state = caseReducer(state, { type: 'ANALYZE_DONE', totalSpecialists: 11 });
    state = caseReducer(state, { type: 'ALL_ROUNDS_COMPLETE', totalRounds: 1, totalMessages: 0 });
    state = caseReducer(state, { type: 'SYNTHESIS_COMPLETE' });
    expect(state.step).toBe('complete');

    // Enter chat
    state = caseReducer(state, { type: 'SET_CHATTING' });
    expect(state.step).toBe('chatting');

    // Send a chat message
    const userMsg: SpecialistChatMessage = {
      id: 'msg-1',
      role: 'user',
      specialist: Specialist.CARDIOLOGIST,
      content: 'Should we increase diuretics?',
      timestamp: Date.now(),
    };
    state = caseReducer(state, { type: 'CHAT_MESSAGE_SENT', message: userMsg });
    expect(state.chatHistory.length).toBe(1);
    expect(state.chatHistory[0].role).toBe('user');

    // Receive response
    const responseMsg: SpecialistChatMessage = {
      id: 'msg-2',
      role: 'specialist',
      specialist: Specialist.CARDIOLOGIST,
      content: 'Yes, increase to 80mg IV BID.',
      timestamp: Date.now(),
    };
    state = caseReducer(state, {
      type: 'CHAT_RESPONSE_RECEIVED',
      message: responseMsg,
      triggeredDiscussions: [{
        from: Specialist.CARDIOLOGIST,
        to: Specialist.NEPHROLOGIST,
        message: 'Higher diuretic dose — check renal function?',
        response: 'Will monitor Cr closely.',
      }],
    });
    expect(state.chatHistory.length).toBe(2);
    expect(state.chatHistory[1].role).toBe('specialist');
    // Triggered discussions should be appended to cross-consult messages
    expect(state.crossConsultMessages.length).toBeGreaterThan(0);
  });

  it('should handle user steering: ask_specialist', () => {
    let state = { ...initialState, step: 'discussion_paused' as const };

    state = caseReducer(state, {
      type: 'USER_STEERING_ACTION',
      action: { type: 'ask_specialist', specialist: Specialist.PHARMACIST, question: 'Renal dosing?' },
    });
    expect(state.step).toBe('cross_consulting');
  });

  it('should handle user steering: inject_hypothesis', () => {
    let state = { ...initialState, step: 'discussion_paused' as const };

    state = caseReducer(state, {
      type: 'USER_STEERING_ACTION',
      action: { type: 'inject_hypothesis', question: 'Could this be cardiorenal syndrome?' },
    });
    expect(state.step).toBe('cross_consulting');
  });

  it('should handle user steering: proceed_to_synthesis', () => {
    let state = { ...initialState, step: 'discussion_paused' as const };

    state = caseReducer(state, {
      type: 'USER_STEERING_ACTION',
      action: { type: 'proceed_to_synthesis' },
    });
    expect(state.step).toBe('synthesizing');
  });

  it('should handle append notes flow', () => {
    let state = {
      ...initialState,
      step: 'chatting' as const,
      intakeData: MOCK_INTAKE_DATA,
      specialistAnalyses: createMockAnalyses(),
    };

    // Append notes
    state = caseReducer(state, { type: 'APPEND_NOTES', additionalNotes: 'New labs: K 4.2' });
    expect(state.rawNotes).toContain('New labs: K 4.2');

    // Incremental intake complete
    const updatedIntake = {
      ...MOCK_INTAKE_DATA,
      encounters: [{ id: 'enc-new', date: '2026-03-06', encounter_type: 'Floor Day 2', labs: [], vitals: {}, imaging: [], notes: 'New labs', procedures_consults: [] }],
      timeline_summary: 'Updated timeline.',
    };
    state = caseReducer(state, {
      type: 'INCREMENTAL_INTAKE_COMPLETE',
      intakeData: updatedIntake,
      updatedAnalyses: createMockAnalyses(),
      discussionMessages: [{ specialist: 'Attending', content: 'Updated', timestamp: Date.now() }],
    });
    expect(state.intakeData).toBe(updatedIntake);
    expect(state.discussionThread.length).toBeGreaterThan(0);
  });

  it('should reset to initial state', () => {
    let state = {
      ...initialState,
      step: 'complete' as const,
      rawNotes: 'some notes',
      intakeData: MOCK_INTAKE_DATA,
      specialistAnalyses: createMockAnalyses(),
      synthesizedPlan: 'A&P here',
    };

    state = caseReducer(state, { type: 'RESET' });
    expect(state).toEqual(initialState);
  });

  it('should handle errors at any step', () => {
    let state = { ...initialState, step: 'analyzing' as const };

    state = caseReducer(state, { type: 'SET_ERROR', error: 'Something went wrong' });
    expect(state.error).toBe('Something went wrong');
    // Step should not change on error — error is displayed as a banner
  });
});
