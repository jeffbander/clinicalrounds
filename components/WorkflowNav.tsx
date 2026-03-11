'use client';

import { Upload, Clock, Stethoscope, MessageSquare, ClipboardList, MessageCircle, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CaseState } from '@/lib/types';
import { cn } from '@/lib/utils';

interface WorkflowNavProps {
  currentStep: CaseState['step'];
  hasIntakeData: boolean;
  hasAnalyses: boolean;
  hasCrossConsults: boolean;
  hasSynthesis: boolean;
  onStepClick?: (step: string) => void;
}

interface StepDef {
  id: string;
  label: string;
  icon: React.ElementType;
  matchSteps: CaseState['step'][];
}

const STEPS: StepDef[] = [
  { id: 'upload', label: 'Upload', icon: Upload, matchSteps: ['idle', 'parsing'] },
  { id: 'timeline', label: 'Timeline', icon: Clock, matchSteps: [] },
  { id: 'analysis', label: 'Analysis', icon: Stethoscope, matchSteps: ['analyzing'] },
  { id: 'discussion', label: 'Discussion', icon: MessageSquare, matchSteps: ['cross_consulting', 'discussion_paused'] },
  { id: 'assessment', label: 'Assessment', icon: ClipboardList, matchSteps: ['synthesizing', 'complete'] },
  { id: 'qa', label: 'Q&A', icon: MessageCircle, matchSteps: ['chatting'] },
];

function getActiveStepIndex(currentStep: CaseState['step']): number {
  const idx = STEPS.findIndex((s) => s.matchSteps.includes(currentStep));
  return idx >= 0 ? idx : 0;
}

function isStepCompleted(
  stepId: string,
  activeIndex: number,
  props: Pick<WorkflowNavProps, 'hasIntakeData' | 'hasAnalyses' | 'hasCrossConsults' | 'hasSynthesis'>
): boolean {
  const stepIndex = STEPS.findIndex((s) => s.id === stepId);
  if (stepIndex >= activeIndex) return false;
  switch (stepId) {
    case 'upload': return props.hasIntakeData;
    case 'timeline': return props.hasIntakeData;
    case 'analysis': return props.hasAnalyses;
    case 'discussion': return props.hasCrossConsults;
    case 'assessment': return props.hasSynthesis;
    default: return false;
  }
}

function isStepClickable(
  stepId: string,
  activeIndex: number,
  props: Pick<WorkflowNavProps, 'hasIntakeData' | 'hasAnalyses' | 'hasCrossConsults' | 'hasSynthesis'>
): boolean {
  return isStepCompleted(stepId, activeIndex, props);
}

export function WorkflowNav({
  currentStep,
  hasIntakeData,
  hasAnalyses,
  hasCrossConsults,
  hasSynthesis,
  onStepClick,
}: WorkflowNavProps) {
  const activeIndex = getActiveStepIndex(currentStep);
  const completionProps = { hasIntakeData, hasAnalyses, hasCrossConsults, hasSynthesis };

  return (
    <nav aria-label="Case analysis workflow" className="border-b border-border/60 bg-card/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <ol className="flex items-center py-3 gap-0">
          {STEPS.map((step, idx) => {
            const isActive = idx === activeIndex;
            const completed = isStepCompleted(step.id, activeIndex, completionProps);
            const clickable = isStepClickable(step.id, activeIndex, completionProps);
            const isPaused = step.id === 'discussion' && currentStep === 'discussion_paused';
            const isFuture = idx > activeIndex;
            const Icon = step.icon;

            return (
              <li key={step.id} className="flex items-center flex-1 min-w-0">
                {/* Connector line before (not for first) */}
                {idx > 0 && (
                  <div
                    className={cn(
                      'h-[2px] flex-1 transition-all duration-500',
                      completed ? 'bg-primary' : isActive ? 'bg-gradient-to-r from-primary to-border' : 'bg-border'
                    )}
                  />
                )}

                <button
                  onClick={() => clickable && onStepClick?.(step.id)}
                  disabled={!clickable}
                  className={cn(
                    'relative flex flex-col items-center gap-1 px-1 sm:px-2 py-1 rounded-lg transition-all duration-200 group min-w-0',
                    clickable && 'cursor-pointer hover:bg-muted/50',
                    !clickable && !isActive && 'cursor-default'
                  )}
                  aria-current={isActive ? 'step' : undefined}
                  title={step.label}
                >
                  {/* Step circle */}
                  <div
                    className={cn(
                      'relative flex items-center justify-center size-8 rounded-full transition-all duration-300',
                      completed && 'bg-primary text-primary-foreground shadow-sm',
                      isActive && 'bg-primary/15 text-primary ring-2 ring-primary/30',
                      isFuture && !completed && 'bg-muted text-muted-foreground/50'
                    )}
                  >
                    {completed ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : (
                      <Icon className="size-4" aria-hidden="true" />
                    )}
                    {/* Active pulse */}
                    {isActive && (
                      <span className="absolute inset-0 rounded-full animate-pulse-ring" />
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      'text-[10px] sm:text-xs font-medium truncate max-w-full transition-colors',
                      isActive && 'text-primary font-semibold',
                      completed && 'text-foreground',
                      isFuture && !completed && 'text-muted-foreground/50'
                    )}
                  >
                    {step.label}
                  </span>

                  {/* Paused indicator */}
                  {isPaused && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 absolute -top-1 -right-1 bg-card">
                      paused
                    </Badge>
                  )}
                </button>

                {/* Connector line after (not for last) */}
                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-[2px] flex-1 transition-all duration-500',
                      completed ? 'bg-primary' : 'bg-border'
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
