'use client';

import { AssessmentPlan } from '@/components/AssessmentPlan';
import { CriticalAlert } from '@/components/CriticalAlert';
import { PostSynthesisQuestions } from '@/components/PostSynthesisQuestions';
import { Button } from '@/components/ui/button';
import { MessageCircle, Loader2 } from 'lucide-react';
import type { UserQuestion } from '@/lib/types';

interface AssessmentViewProps {
  synthesizedPlan: string;
  isStreaming: boolean;
  criticalAlerts: Array<{ specialist: string; detail: string }>;
  pendingQuestions: UserQuestion[];
  onAnswerQuestion: (id: string, answer: string | null) => void;
  onRefine: () => void;
  isRefining: boolean;
  // Optional: allow entering Q&A chat after complete
  isComplete?: boolean;
  onEnterChat?: () => void;
}

export function AssessmentView({
  synthesizedPlan,
  isStreaming,
  criticalAlerts,
  pendingQuestions,
  onAnswerQuestion,
  onRefine,
  isRefining,
  isComplete,
  onEnterChat,
}: AssessmentViewProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <CriticalAlert alerts={criticalAlerts} />
      )}

      {/* Synthesizing indicator before content arrives */}
      {isStreaming && !synthesizedPlan && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Generating assessment &amp; plan...
        </div>
      )}

      {/* Assessment & Plan */}
      {(synthesizedPlan || isStreaming) && (
        <AssessmentPlan plan={synthesizedPlan} isStreaming={isStreaming} />
      )}

      {/* Post-synthesis questions */}
      {pendingQuestions.length > 0 && (
        <PostSynthesisQuestions
          questions={pendingQuestions}
          onAnswer={onAnswerQuestion}
          onRefine={onRefine}
          isRefining={isRefining}
        />
      )}

      {/* Enter Q&A button */}
      {isComplete && onEnterChat && (
        <div className="flex justify-center pt-2">
          <Button onClick={onEnterChat} variant="outline" size="lg" className="gap-2">
            <MessageCircle className="size-4" aria-hidden="true" />
            Ask Follow-up Questions
          </Button>
        </div>
      )}
    </div>
  );
}
