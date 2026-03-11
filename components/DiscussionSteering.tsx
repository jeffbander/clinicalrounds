'use client';

import { useState } from 'react';
import { MessageCircle, PlayCircle, ArrowRight, Lightbulb, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Specialist, SPECIALIST_CONFIG } from '@/lib/types';
import type { CrossConsultRound } from '@/lib/types';

interface DiscussionSteeringProps {
  roundsCompleted: number;
  crossConsultRounds: CrossConsultRound[];
  onContinue: (additionalRounds: number) => void;
  onAskSpecialist: (specialist: Specialist, question: string) => void;
  onInjectHypothesis: (hypothesis: string) => void;
  onProceedToSynthesis: () => void;
}

export function DiscussionSteering({
  roundsCompleted,
  crossConsultRounds,
  onContinue,
  onAskSpecialist,
  onInjectHypothesis,
  onProceedToSynthesis,
}: DiscussionSteeringProps) {
  const [additionalRounds, setAdditionalRounds] = useState(1);
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist>(Specialist.ATTENDING);
  const [specialistQuestion, setSpecialistQuestion] = useState('');
  const [hypothesis, setHypothesis] = useState('');

  // Summarize exchanges per round
  const roundSummaries = crossConsultRounds.map((r) => {
    const participantSet = new Set<string>();
    for (const msg of r.messages) {
      participantSet.add(msg.from);
      participantSet.add(msg.to);
    }
    return {
      round: r.round,
      exchangeCount: r.messages.length,
      participants: Array.from(participantSet),
    };
  });

  const totalExchanges = roundSummaries.reduce((sum, r) => sum + r.exchangeCount, 0);

  const handleAskSpecialist = () => {
    if (!specialistQuestion.trim()) return;
    onAskSpecialist(selectedSpecialist, specialistQuestion.trim());
    setSpecialistQuestion('');
  };

  const handleInjectHypothesis = () => {
    if (!hypothesis.trim()) return;
    onInjectHypothesis(hypothesis.trim());
    setHypothesis('');
  };

  return (
    <div className="rounded-lg border bg-card p-5 space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="size-5 text-primary" />
        <h3 className="text-base font-semibold">Discussion Paused</h3>
        <Badge variant="secondary" className="ml-auto">
          {roundsCompleted} round{roundsCompleted !== 1 ? 's' : ''} completed
        </Badge>
      </div>

      {/* Round Summary */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {totalExchanges} specialist exchange{totalExchanges !== 1 ? 's' : ''} across {roundsCompleted} round{roundsCompleted !== 1 ? 's' : ''}:
        </p>
        <div className="flex flex-wrap gap-2">
          {roundSummaries.map((rs) => (
            <Badge key={rs.round} variant="outline" className="text-xs">
              Round {rs.round}: {rs.exchangeCount} exchange{rs.exchangeCount !== 1 ? 's' : ''} ({rs.participants.length} specialist{rs.participants.length !== 1 ? 's' : ''})
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Continue Discussion */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <PlayCircle className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Continue Discussion</span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={additionalRounds}
            onChange={(e) => setAdditionalRounds(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value={1}>1 additional round</option>
            <option value={2}>2 additional rounds</option>
            <option value={3}>3 additional rounds</option>
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onContinue(additionalRounds)}
          >
            Continue
          </Button>
        </div>
      </div>

      <Separator />

      {/* Ask a Specialist */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Ask a Specialist</span>
        </div>
        <div className="flex flex-col gap-2">
          <select
            value={selectedSpecialist}
            onChange={(e) => setSelectedSpecialist(e.target.value as Specialist)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {Object.values(Specialist).map((s) => {
              const config = SPECIALIST_CONFIG[s];
              return (
                <option key={s} value={s}>
                  {config.icon} {config.name}
                </option>
              );
            })}
          </select>
          <div className="flex gap-2">
            <input
              type="text"
              value={specialistQuestion}
              onChange={(e) => setSpecialistQuestion(e.target.value)}
              placeholder="Type your question for this specialist..."
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAskSpecialist();
              }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleAskSpecialist}
              disabled={!specialistQuestion.trim()}
            >
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Inject Hypothesis */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Inject Hypothesis</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Pose a hypothesis for the entire team to consider in the next round.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={hypothesis}
            onChange={(e) => setHypothesis(e.target.value)}
            placeholder="e.g., Could this be drug-induced lupus given the timeline?"
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleInjectHypothesis();
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleInjectHypothesis}
            disabled={!hypothesis.trim()}
          >
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Proceed to Assessment */}
      <Button
        className="w-full"
        onClick={onProceedToSynthesis}
      >
        Proceed to Assessment
      </Button>
    </div>
  );
}
