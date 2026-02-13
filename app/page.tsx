'use client';

import { useReducer, useCallback, useState } from 'react';
import { PasteBox } from '@/components/PasteBox';
import { SpecialistGrid } from '@/components/SpecialistGrid';
import { TeamDiscussion } from '@/components/TeamDiscussion';
import { ConferenceView } from '@/components/ConferenceView';
import { AssessmentPlan } from '@/components/AssessmentPlan';
import { PostSynthesisQuestions } from '@/components/PostSynthesisQuestions';
import { ScoringSystemsSidebar } from '@/components/ScoringSystemsSidebar';
import { CriticalAlert } from '@/components/CriticalAlert';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Stethoscope, RotateCcw, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn, formatCost, generateId } from '@/lib/utils';
import type {
  CaseState,
  AnalyzeResponse,
  CrossConsultResponse,
  AdditionalDataResponse,
  SpecialistAnalysis,
  UserQuestion,
  ScoringSystem,
  AnalysisStatus,
  DiscussionMessage,
  CrossConsultMessage,
  IntakeData,
  AnalyzeSSEEvent,
  CrossConsultSSEEvent,
} from '@/lib/types';
import { Specialist, SPECIALIST_CONFIG } from '@/lib/types';

// ─── Reducer ─────────────────────────────────────────────────────────────────

type Action =
  | { type: 'START_ANALYSIS'; rawNotes: string }
  | { type: 'SET_PARSING' }
  | { type: 'SET_ANALYZING'; statuses: Record<string, AnalysisStatus> }
  | { type: 'INTAKE_COMPLETE'; intakeData: IntakeData }
  | { type: 'SPECIALIST_COMPLETE'; specialist: string; analysis: SpecialistAnalysis; discussionMessage: DiscussionMessage }
  | { type: 'SPECIALIST_ERROR'; specialist: string; error: string }
  | { type: 'ANALYZE_DONE' }
  | { type: 'ANALYSIS_COMPLETE'; data: AnalyzeResponse }
  | { type: 'SET_CROSS_CONSULTING' }
  | { type: 'CROSS_CONSULT_MESSAGE'; message: CrossConsultMessage; discussionMessage: DiscussionMessage }
  | { type: 'CROSS_CONSULT_DONE' }
  | { type: 'CROSS_CONSULT_COMPLETE'; data: CrossConsultResponse }
  | { type: 'ANSWER_QUESTION'; questionId: string; answer: string | null }
  | { type: 'ADDITIONAL_DATA_COMPLETE'; data: AdditionalDataResponse }
  | { type: 'SET_SYNTHESIZING' }
  | { type: 'STREAM_SYNTHESIS'; chunk: string }
  | { type: 'SYNTHESIS_COMPLETE' }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET' };

const initialState: CaseState = {
  step: 'idle',
  rawNotes: '',
  intakeData: null,
  specialistAnalyses: {},
  specialistStatuses: {},
  crossConsultMessages: [],
  discussionThread: [],
  userAnswers: {},
  pendingQuestions: [],
  synthesizedPlan: '',
  isStreaming: false,
  criticalAlerts: [],
  scoringSystems: [],
  tokenUsage: { input: 0, output: 0, estimatedCost: 0 },
  error: null,
};

/** Extract ONLY questions_for_user — rare, truly-missing-data questions for the clinician. */
function extractUserQuestions(analyses: Record<string, SpecialistAnalysis>): UserQuestion[] {
  const questions: UserQuestion[] = [];
  for (const [specialist, analysis] of Object.entries(analyses)) {
    const qs = Array.isArray(analysis.questions_for_user) ? analysis.questions_for_user : [];
    for (const q of qs) {
      if (typeof q === 'string' && q.trim()) {
        questions.push({
          id: generateId(),
          specialist,
          question: q,
        });
      }
    }
  }
  return questions;
}

function extractCriticalAlerts(analyses: Record<string, SpecialistAnalysis>): Array<{ specialist: string; detail: string }> {
  const alerts: Array<{ specialist: string; detail: string }> = [];
  for (const [specialist, analysis] of Object.entries(analyses)) {
    const concerns = Array.isArray(analysis.concerns) ? analysis.concerns : [];
    for (const concern of concerns) {
      if (concern.severity === 'critical') {
        alerts.push({ specialist, detail: concern.detail });
      }
    }
    const critActions = (analysis as unknown as Record<string, unknown>).critical_actions;
    if (Array.isArray(critActions)) {
      for (const action of critActions) {
        if (typeof action === 'string') {
          alerts.push({ specialist, detail: action });
        }
      }
    }
  }
  return alerts;
}

function extractScoringSystems(analyses: Record<string, SpecialistAnalysis>): ScoringSystem[] {
  const systems: ScoringSystem[] = [];
  for (const analysis of Object.values(analyses)) {
    const applied = Array.isArray(analysis.scoring_systems_applied) ? analysis.scoring_systems_applied : [];
    systems.push(...applied);
  }
  return systems;
}

function deriveStatuses(analyses: Record<string, SpecialistAnalysis>): Record<string, AnalysisStatus> {
  const statuses: Record<string, AnalysisStatus> = {};
  for (const [specialist, analysis] of Object.entries(analyses)) {
    const concerns = Array.isArray(analysis.concerns) ? analysis.concerns : [];
    const hasCritical = concerns.some((c) => c.severity === 'critical');
    statuses[specialist] = hasCritical ? 'critical' : 'complete';
  }
  return statuses;
}

function estimateTotalExchanges(analyses: Record<string, SpecialistAnalysis>): number {
  let count = 0;
  for (const a of Object.values(analyses)) {
    count += a.cross_consults.length + a.questions_for_team.length;
  }
  return Math.max(count, 1);
}

function caseReducer(state: CaseState, action: Action): CaseState {
  switch (action.type) {
    case 'START_ANALYSIS':
      return {
        ...initialState,
        step: 'parsing',
        rawNotes: action.rawNotes,
      };

    case 'SET_PARSING':
      return { ...state, step: 'parsing' };

    case 'SET_ANALYZING':
      return { ...state, step: 'analyzing', specialistStatuses: action.statuses };

    case 'INTAKE_COMPLETE':
      return { ...state, intakeData: action.intakeData };

    case 'SPECIALIST_COMPLETE': {
      const analysis = action.analysis;
      const concerns = Array.isArray(analysis.concerns) ? analysis.concerns : [];
      const hasCritical = concerns.some((c) => c.severity === 'critical');
      const newAlerts: Array<{ specialist: string; detail: string }> = [];
      for (const concern of concerns) {
        if (concern.severity === 'critical') {
          newAlerts.push({ specialist: action.specialist, detail: concern.detail });
        }
      }
      const critActions = (analysis as unknown as Record<string, unknown>).critical_actions;
      if (Array.isArray(critActions)) {
        for (const ca of critActions) {
          if (typeof ca === 'string') {
            newAlerts.push({ specialist: action.specialist, detail: ca });
          }
        }
      }
      const newScores = Array.isArray(analysis.scoring_systems_applied) ? analysis.scoring_systems_applied : [];
      return {
        ...state,
        specialistAnalyses: { ...state.specialistAnalyses, [action.specialist]: analysis },
        specialistStatuses: {
          ...state.specialistStatuses,
          [action.specialist]: hasCritical ? 'critical' : 'complete',
        },
        discussionThread: [...state.discussionThread, action.discussionMessage],
        criticalAlerts: [...state.criticalAlerts, ...newAlerts],
        scoringSystems: [...state.scoringSystems, ...newScores],
      };
    }

    case 'SPECIALIST_ERROR':
      return {
        ...state,
        specialistStatuses: {
          ...state.specialistStatuses,
          [action.specialist]: 'complete',
        },
      };

    case 'ANALYZE_DONE': {
      const questions = extractUserQuestions(state.specialistAnalyses);
      return {
        ...state,
        step: 'cross_consulting',
        pendingQuestions: questions,
        error: null,
      };
    }

    case 'CROSS_CONSULT_MESSAGE':
      return {
        ...state,
        crossConsultMessages: [...state.crossConsultMessages, action.message],
        discussionThread: [...state.discussionThread, action.discussionMessage],
      };

    case 'CROSS_CONSULT_DONE':
      return { ...state, step: 'synthesizing' };

    case 'ANALYSIS_COMPLETE': {
      const { intakeData, specialistAnalyses, discussionMessages } = action.data;
      const questions = extractUserQuestions(specialistAnalyses);
      const alerts = extractCriticalAlerts(specialistAnalyses);
      const scores = extractScoringSystems(specialistAnalyses);
      const statuses = deriveStatuses(specialistAnalyses);
      return {
        ...state,
        step: 'cross_consulting',
        intakeData,
        specialistAnalyses,
        specialistStatuses: statuses,
        discussionThread: [...state.discussionThread, ...discussionMessages],
        pendingQuestions: questions,
        criticalAlerts: alerts,
        scoringSystems: scores,
        error: null,
      };
    }

    case 'SET_CROSS_CONSULTING':
      return { ...state, step: 'cross_consulting' };

    case 'CROSS_CONSULT_COMPLETE': {
      const { messages, updatedAnalyses, discussionMessages } = action.data;
      const newAlerts = extractCriticalAlerts(updatedAnalyses);
      const newScores = extractScoringSystems(updatedAnalyses);
      const newStatuses = deriveStatuses(updatedAnalyses);
      return {
        ...state,
        step: 'synthesizing',
        crossConsultMessages: [...state.crossConsultMessages, ...messages],
        specialistAnalyses: { ...state.specialistAnalyses, ...updatedAnalyses },
        specialistStatuses: { ...state.specialistStatuses, ...newStatuses },
        discussionThread: [...state.discussionThread, ...discussionMessages],
        criticalAlerts: [...state.criticalAlerts, ...newAlerts],
        scoringSystems: [...state.scoringSystems, ...newScores],
      };
    }

    case 'ANSWER_QUESTION': {
      const updated = state.pendingQuestions.map((q) =>
        q.id === action.questionId ? { ...q, answer: action.answer } : q
      );
      return {
        ...state,
        pendingQuestions: updated,
        userAnswers: { ...state.userAnswers, [action.questionId]: action.answer },
      };
    }

    case 'ADDITIONAL_DATA_COMPLETE': {
      const { updatedAnalyses, discussionMessages } = action.data;
      const newAlerts = extractCriticalAlerts(updatedAnalyses);
      const newScores = extractScoringSystems(updatedAnalyses);
      const newStatuses = deriveStatuses(updatedAnalyses);
      return {
        ...state,
        step: 'cross_consulting',
        specialistAnalyses: { ...state.specialistAnalyses, ...updatedAnalyses },
        specialistStatuses: { ...state.specialistStatuses, ...newStatuses },
        discussionThread: [...state.discussionThread, ...discussionMessages],
        criticalAlerts: [...state.criticalAlerts, ...newAlerts],
        scoringSystems: [...state.scoringSystems, ...newScores],
      };
    }

    case 'SET_SYNTHESIZING':
      return { ...state, step: 'synthesizing', isStreaming: true, synthesizedPlan: '' };

    case 'STREAM_SYNTHESIS':
      return { ...state, synthesizedPlan: state.synthesizedPlan + action.chunk };

    case 'SYNTHESIS_COMPLETE':
      return { ...state, step: 'complete', isStreaming: false };

    case 'SET_ERROR':
      return { ...state, error: action.error, isStreaming: false };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function Home() {
  const [state, dispatch] = useReducer(caseReducer, initialState);
  const [isRefining, setIsRefining] = useState(false);
  const [specialistsExpanded, setSpecialistsExpanded] = useState(false);

  const isWorking = ['parsing', 'analyzing', 'cross_consulting', 'synthesizing'].includes(state.step);

  // ─── SSE reader helper ────────────────────────────────────────────

  async function readSSEStream<T>(
    response: Response,
    onEvent: (event: T) => void
  ): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response stream available');
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      // Keep the last potentially incomplete line in the buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6)) as T;
            onEvent(parsed);
          } catch {
            // Skip unparseable lines
          }
        }
      }
    }

    // Process any remaining data in the buffer
    if (buffer.trim().startsWith('data: ')) {
      try {
        const parsed = JSON.parse(buffer.trim().slice(6)) as T;
        onEvent(parsed);
      } catch {
        // Skip
      }
    }
  }

  // ─── Streaming synthesis helper ────────────────────────────────────

  const streamSynthesis = useCallback(async (
    analyses: Record<string, SpecialistAnalysis>,
    crossConsults: CaseState['crossConsultMessages'],
    intakeData: CaseState['intakeData']
  ) => {
    dispatch({ type: 'SET_SYNTHESIZING' });

    const res = await fetch('/api/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analyses, crossConsults, intakeData }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `Synthesis failed (${res.status})`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response stream available');

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      dispatch({ type: 'STREAM_SYNTHESIS', chunk });
    }

    dispatch({ type: 'SYNTHESIS_COMPLETE' });
  }, []);

  // ─── Auto-chained pipeline ─────────────────────────────────────────

  const runAnalysis = useCallback(async (rawNotes: string) => {
    dispatch({ type: 'START_ANALYSIS', rawNotes });

    const allAnalyzing: Record<string, AnalysisStatus> = {};
    for (const s of Object.values(Specialist)) {
      allAnalyzing[s] = 'analyzing';
    }
    dispatch({ type: 'SET_ANALYZING', statuses: allAnalyzing });

    try {
      // Step 1: Analyze via SSE stream
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawNotes }),
      });

      if (!analyzeRes.ok) {
        const err = await analyzeRes.text();
        throw new Error(err || `Analysis failed (${analyzeRes.status})`);
      }

      // Accumulate results from the SSE stream for passing to next step
      let intakeData: IntakeData | null = null;
      const specialistAnalyses: Record<string, SpecialistAnalysis> = {};

      await readSSEStream<AnalyzeSSEEvent | { type: 'error'; error: string }>(analyzeRes, (event) => {
        if (event.type === 'error') {
          throw new Error((event as { type: 'error'; error: string }).error);
        }
        switch (event.type) {
          case 'intake_complete':
            intakeData = event.intakeData;
            dispatch({ type: 'INTAKE_COMPLETE', intakeData: event.intakeData });
            break;
          case 'specialist_complete':
            specialistAnalyses[event.specialist] = event.analysis;
            dispatch({
              type: 'SPECIALIST_COMPLETE',
              specialist: event.specialist,
              analysis: event.analysis,
              discussionMessage: event.discussionMessage,
            });
            break;
          case 'specialist_error':
            dispatch({ type: 'SPECIALIST_ERROR', specialist: event.specialist, error: event.error });
            break;
          case 'analyze_done':
            dispatch({ type: 'ANALYZE_DONE' });
            break;
        }
      });

      if (!intakeData) throw new Error('Intake data not received');

      // Step 2: Cross-consult via SSE stream
      const crossConsultMessages: CrossConsultMessage[] = [];

      const crossRes = await fetch('/api/cross-consult?stream=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analyses: specialistAnalyses,
          intakeData,
        }),
      });

      if (!crossRes.ok) {
        const err = await crossRes.text();
        throw new Error(err || `Cross-consult failed (${crossRes.status})`);
      }

      await readSSEStream<CrossConsultSSEEvent | { type: 'error'; error: string }>(crossRes, (event) => {
        if (event.type === 'error') {
          throw new Error((event as { type: 'error'; error: string }).error);
        }
        switch (event.type) {
          case 'cross_consult_message':
            crossConsultMessages.push(event.message);
            dispatch({
              type: 'CROSS_CONSULT_MESSAGE',
              message: event.message,
              discussionMessage: event.discussionMessage,
            });
            break;
          case 'cross_consult_done':
            dispatch({ type: 'CROSS_CONSULT_DONE' });
            break;
        }
      });

      // Step 3: Synthesize (streaming — unchanged)
      await streamSynthesis(specialistAnalyses, crossConsultMessages, intakeData);
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : 'Analysis failed' });
    }
  }, [streamSynthesis]);

  // ─── Refine with answers (post-synthesis) ──────────────────────────

  const handleRefineWithAnswers = useCallback(async () => {
    if (!state.intakeData) return;
    setIsRefining(true);

    try {
      // Re-analyze with user answers
      const reAnalyzeRes = await fetch('/api/additional-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: state.userAnswers,
          previousAnalyses: state.specialistAnalyses,
          intakeData: state.intakeData,
        }),
      });

      if (!reAnalyzeRes.ok) {
        const err = await reAnalyzeRes.text();
        throw new Error(err || `Re-analysis failed (${reAnalyzeRes.status})`);
      }

      const reAnalyzeData: AdditionalDataResponse = await reAnalyzeRes.json();
      dispatch({ type: 'ADDITIONAL_DATA_COMPLETE', data: reAnalyzeData });

      // Cross-consult on updated analyses
      const updatedAnalyses = { ...state.specialistAnalyses, ...reAnalyzeData.updatedAnalyses };

      dispatch({ type: 'SET_CROSS_CONSULTING' });
      const crossRes = await fetch('/api/cross-consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyses: updatedAnalyses, intakeData: state.intakeData }),
      });

      if (!crossRes.ok) {
        const err = await crossRes.text();
        throw new Error(err || `Cross-consult failed (${crossRes.status})`);
      }

      const crossData: CrossConsultResponse = await crossRes.json();
      dispatch({ type: 'CROSS_CONSULT_COMPLETE', data: crossData });

      // Re-synthesize
      const mergedAnalyses = { ...updatedAnalyses, ...crossData.updatedAnalyses };
      await streamSynthesis(mergedAnalyses, crossData.messages, state.intakeData);
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : 'Refinement failed' });
    } finally {
      setIsRefining(false);
    }
  }, [state.intakeData, state.userAnswers, state.specialistAnalyses, streamSynthesis]);

  const handleAnswerQuestion = useCallback((questionId: string, answer: string | null) => {
    dispatch({ type: 'ANSWER_QUESTION', questionId, answer });
  }, []);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' });
    setSpecialistsExpanded(false);
  }, []);

  // ─── Derived State ───────────────────────────────────────────────────

  const hasAnalyses = Object.keys(state.specialistAnalyses).length > 0;

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Stethoscope className="size-5 text-primary" aria-hidden="true" />
            <h1 className="text-lg font-semibold tracking-tight">ClinicalRounds</h1>
          </div>
          <div className="flex items-center gap-3">
            {state.tokenUsage.estimatedCost > 0 && (
              <span className="text-xs text-muted-foreground font-mono hidden sm:block">
                {formatCost(state.tokenUsage.input, state.tokenUsage.output)}
              </span>
            )}
            {state.step !== 'idle' && (
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
                <RotateCcw className="size-3.5" aria-hidden="true" />
                New Case
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Error Banner */}
        {state.error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Idle - Show PasteBox */}
        {state.step === 'idle' && (
          <div className="mx-auto max-w-2xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                AI Multidisciplinary Case Review
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
                Paste clinical notes and receive instant analysis from 9 AI specialists.
                Structured findings, cross-consultation, and a synthesized assessment &amp; plan.
              </p>
            </div>
            <PasteBox onSubmit={runAnalysis} isAnalyzing={false} />
          </div>
        )}

        {/* In-progress: show pipeline status */}
        {state.step !== 'idle' && state.step !== 'complete' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Main Column */}
            <div className="space-y-6 min-w-0">
              {/* Parsing indicator */}
              {state.step === 'parsing' && (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Parsing clinical notes...
                </div>
              )}

              {/* Specialist Grid — collapses during cross-consulting */}
              {state.step !== 'parsing' && (
                <div className={cn(
                  'transition-all duration-500',
                  state.step === 'cross_consulting' && 'max-h-0 overflow-hidden opacity-0'
                )}>
                  <SpecialistGrid
                    analyses={state.specialistAnalyses}
                    statuses={state.specialistStatuses}
                  />
                </div>
              )}

              {/* Cross-Consultation Conference View */}
              {state.step === 'cross_consulting' && (
                <ConferenceView
                  exchanges={state.crossConsultMessages}
                  isActive={state.step === 'cross_consulting'}
                  totalExpected={estimateTotalExchanges(state.specialistAnalyses)}
                />
              )}

              {/* Team Discussion */}
              {state.discussionThread.length > 0 && (
                <TeamDiscussion messages={state.discussionThread} />
              )}

              {/* Synthesizing indicator */}
              {state.step === 'synthesizing' && !state.synthesizedPlan && (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Generating assessment &amp; plan...
                </div>
              )}

              {/* Streaming Assessment & Plan */}
              {(state.synthesizedPlan || state.step === 'synthesizing') && (
                <AssessmentPlan
                  plan={state.synthesizedPlan}
                  isStreaming={state.isStreaming}
                />
              )}
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {state.scoringSystems.length > 0 && (
                <ScoringSystemsSidebar scores={state.scoringSystems} />
              )}

              {state.rawNotes && (
                <div className="rounded-lg border bg-card">
                  <div className="px-4 py-3 border-b">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Original Notes
                    </h3>
                  </div>
                  <div className="p-4 max-h-[200px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-mono text-[11px] text-muted-foreground leading-relaxed">
                      {state.rawNotes.length > 1000
                        ? state.rawNotes.slice(0, 1000) + '...'
                        : state.rawNotes}
                    </pre>
                  </div>
                </div>
              )}

              {state.tokenUsage.estimatedCost > 0 && (
                <div className="rounded-lg border bg-card px-4 py-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Token Usage
                  </h3>
                  <div className="space-y-1 text-xs text-muted-foreground font-mono">
                    <div className="flex justify-between">
                      <span>Input</span>
                      <span>{state.tokenUsage.input.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Output</span>
                      <span>{state.tokenUsage.output.toLocaleString()}</span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between font-semibold">
                      <span>Est. Cost</span>
                      <span>{formatCost(state.tokenUsage.input, state.tokenUsage.output)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Complete state: redesigned layout */}
        {state.step === 'complete' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Main Column */}
            <div className="space-y-6 min-w-0">
              {/* Critical Alerts */}
              {state.criticalAlerts.length > 0 && (
                <CriticalAlert alerts={state.criticalAlerts} />
              )}

              {/* Assessment & Plan — front and center */}
              <AssessmentPlan
                plan={state.synthesizedPlan}
                isStreaming={false}
              />

              {/* Optional questions panel — collapsed by default */}
              {state.pendingQuestions.length > 0 && (
                <PostSynthesisQuestions
                  questions={state.pendingQuestions}
                  onAnswer={handleAnswerQuestion}
                  onRefine={handleRefineWithAnswers}
                  isRefining={isRefining}
                />
              )}

              {/* Team Discussion — cross-consult thread */}
              {state.discussionThread.length > 0 && (
                <TeamDiscussion messages={state.discussionThread} />
              )}

              {/* Specialist Grid — collapsed, expandable for reference */}
              {hasAnalyses && (
                <div className="rounded-lg border bg-card">
                  <button
                    onClick={() => setSpecialistsExpanded(!specialistsExpanded)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                    aria-expanded={specialistsExpanded}
                  >
                    <span className="text-sm font-medium">Specialist Analyses</span>
                    {specialistsExpanded ? (
                      <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                    )}
                  </button>
                  {specialistsExpanded && (
                    <div className="border-t p-4">
                      <SpecialistGrid
                        analyses={state.specialistAnalyses}
                        statuses={state.specialistStatuses}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {state.scoringSystems.length > 0 && (
                <ScoringSystemsSidebar scores={state.scoringSystems} />
              )}

              {state.rawNotes && (
                <div className="rounded-lg border bg-card">
                  <div className="px-4 py-3 border-b">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Original Notes
                    </h3>
                  </div>
                  <div className="p-4 max-h-[200px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-mono text-[11px] text-muted-foreground leading-relaxed">
                      {state.rawNotes.length > 1000
                        ? state.rawNotes.slice(0, 1000) + '...'
                        : state.rawNotes}
                    </pre>
                  </div>
                </div>
              )}

              {state.tokenUsage.estimatedCost > 0 && (
                <div className="rounded-lg border bg-card px-4 py-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Token Usage
                  </h3>
                  <div className="space-y-1 text-xs text-muted-foreground font-mono">
                    <div className="flex justify-between">
                      <span>Input</span>
                      <span>{state.tokenUsage.input.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Output</span>
                      <span>{state.tokenUsage.output.toLocaleString()}</span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between font-semibold">
                      <span>Est. Cost</span>
                      <span>{formatCost(state.tokenUsage.input, state.tokenUsage.output)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
