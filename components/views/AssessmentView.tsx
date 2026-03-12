'use client';

import { useState } from 'react';
import { AssessmentPlan } from '@/components/AssessmentPlan';
import { CriticalAlert } from '@/components/CriticalAlert';
import { PostSynthesisQuestions } from '@/components/PostSynthesisQuestions';
import { CreatePresentationModal } from '@/components/CreatePresentationModal';
import { Button } from '@/components/ui/button';
import { MessageCircle, Loader2, Presentation } from 'lucide-react';
import type {
  UserQuestion,
  IntakeData,
  SpecialistAnalysis,
  CrossConsultMessage,
  ScoringSystem,
} from '@/lib/types';

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
  // Case data for presentation generation
  intakeData?: IntakeData | null;
  specialistAnalyses?: Record<string, SpecialistAnalysis>;
  crossConsultMessages?: CrossConsultMessage[];
  scoringSystems?: ScoringSystem[];
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
  intakeData,
  specialistAnalyses,
  crossConsultMessages,
  scoringSystems,
}: AssessmentViewProps) {
  const [showPresentationModal, setShowPresentationModal] = useState(false);

  const canCreatePresentation = isComplete && intakeData && specialistAnalyses && Object.keys(specialistAnalyses).length > 0;

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

      {/* Action buttons */}
      {isComplete && (onEnterChat || canCreatePresentation) && (
        <div className="flex justify-center gap-3 pt-2">
          {onEnterChat && (
            <Button onClick={onEnterChat} variant="outline" size="lg" className="gap-2">
              <MessageCircle className="size-4" aria-hidden="true" />
              Ask Follow-up Questions
            </Button>
          )}
          {canCreatePresentation && (
            <Button
              onClick={() => setShowPresentationModal(true)}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <Presentation className="size-4" aria-hidden="true" />
              Create Presentation
            </Button>
          )}
        </div>
      )}

      {/* Presentation Modal */}
      {showPresentationModal && intakeData && specialistAnalyses && (
        <CreatePresentationModal
          intakeData={intakeData}
          specialistAnalyses={specialistAnalyses}
          crossConsultMessages={crossConsultMessages ?? []}
          synthesizedPlan={synthesizedPlan}
          criticalAlerts={criticalAlerts}
          scoringSystems={scoringSystems ?? []}
          onClose={() => setShowPresentationModal(false)}
        />
      )}
    </div>
  );
}
