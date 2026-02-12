'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, MessageCircleQuestion, Send, RotateCcw } from 'lucide-react';
import type { UserQuestion } from '@/lib/types';

interface PostSynthesisQuestionsProps {
  questions: UserQuestion[];
  onAnswer: (questionId: string, answer: string | null) => void;
  onRefine: () => void;
  isRefining: boolean;
}

export function PostSynthesisQuestions({
  questions,
  onAnswer,
  onRefine,
  isRefining,
}: PostSynthesisQuestionsProps) {
  const [expanded, setExpanded] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (questions.length === 0) return null;

  const answeredCount = questions.filter((q) => q.answer !== undefined).length;
  const allAnswered = answeredCount === questions.length;

  return (
    <div className="rounded-lg border bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-medium">Optional Clarifications</span>
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {questions.length} question{questions.length !== 1 ? 's' : ''}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <div className="border-t px-4 py-3 space-y-4">
          <p className="text-xs text-muted-foreground">
            Specialists identified these optional questions. Answering them may improve the analysis,
            but the assessment above is already complete.
          </p>

          {questions.map((q) => (
            <div key={q.id} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {q.specialist}
              </label>
              <p className="text-sm">{q.question}</p>
              {q.answer !== undefined ? (
                <p className="text-sm text-muted-foreground italic">
                  Answered: {q.answer || 'N/A'}
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={drafts[q.id] || ''}
                    onChange={(e) => setDrafts({ ...drafts, [q.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && drafts[q.id]?.trim()) {
                        onAnswer(q.id, drafts[q.id].trim());
                      }
                    }}
                    placeholder="Type answer..."
                    className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label={`Answer for ${q.specialist}: ${q.question}`}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (drafts[q.id]?.trim()) {
                        onAnswer(q.id, drafts[q.id].trim());
                      }
                    }}
                    disabled={!drafts[q.id]?.trim()}
                    aria-label="Send answer"
                  >
                    <Send className="size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onAnswer(q.id, null)}
                    aria-label="Mark as not available"
                  >
                    N/A
                  </Button>
                </div>
              )}
            </div>
          ))}

          {allAnswered && (
            <Button
              onClick={onRefine}
              disabled={isRefining}
              className="gap-1.5"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              {isRefining ? 'Refining...' : 'Refine Analysis'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
