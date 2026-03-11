'use client';

import { ConferenceView } from '@/components/ConferenceView';
import { DiscussionSteering } from '@/components/DiscussionSteering';
import { estimateTotalExchanges } from '@/lib/reducer';
import type {
  CrossConsultMessage,
  CrossConsultRound,
  SpecialistAnalysis,
} from '@/lib/types';
import { Specialist } from '@/lib/types';

interface DiscussionViewProps {
  crossConsultMessages: CrossConsultMessage[];
  crossConsultRounds: CrossConsultRound[];
  currentRound: number;
  maxRounds: number;
  specialistAnalyses: Record<string, SpecialistAnalysis>;
  isActive: boolean;
  // Discussion steering (when paused)
  isPaused: boolean;
  onContinue: (additionalRounds: number) => void;
  onAskSpecialist: (specialist: Specialist, question: string) => void;
  onInjectHypothesis: (hypothesis: string) => void;
  onProceedToSynthesis: () => void;
}

export function DiscussionView({
  crossConsultMessages,
  crossConsultRounds,
  currentRound,
  maxRounds,
  specialistAnalyses,
  isActive,
  isPaused,
  onContinue,
  onAskSpecialist,
  onInjectHypothesis,
  onProceedToSynthesis,
}: DiscussionViewProps) {
  const totalExpected = estimateTotalExchanges(specialistAnalyses);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ConferenceView
        exchanges={crossConsultMessages}
        isActive={isActive}
        totalExpected={totalExpected}
        rounds={crossConsultRounds.length > 0 ? crossConsultRounds : undefined}
        currentRound={currentRound}
        maxRounds={maxRounds}
      />

      {isPaused && (
        <DiscussionSteering
          roundsCompleted={currentRound}
          crossConsultRounds={crossConsultRounds}
          onContinue={onContinue}
          onAskSpecialist={onAskSpecialist}
          onInjectHypothesis={onInjectHypothesis}
          onProceedToSynthesis={onProceedToSynthesis}
        />
      )}
    </div>
  );
}
