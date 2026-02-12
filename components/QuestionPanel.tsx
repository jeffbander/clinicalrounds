'use client';

import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SPECIALIST_CONFIG, Specialist } from '@/lib/types';
import type { UserQuestion } from '@/lib/types';
import { MessageCircleQuestion, Send, Minus, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionPanelProps {
  questions: UserQuestion[];
  onAnswer: (questionId: string, answer: string | null) => void;
}

function getSpecialistLabel(name: string): string {
  const specialist = Object.values(Specialist).find((s) => s === name);
  if (specialist && SPECIALIST_CONFIG[specialist]) {
    return SPECIALIST_CONFIG[specialist].name;
  }
  return name;
}

export function QuestionPanel({ questions, onAnswer }: QuestionPanelProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const unanswered = questions.filter((q) => q.answer === undefined);
  const answered = questions.filter((q) => q.answer !== undefined);

  function handleSubmit(questionId: string) {
    const draft = drafts[questionId];
    if (draft && draft.trim().length > 0) {
      onAnswer(questionId, draft.trim());
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  }

  function handleNA(questionId: string) {
    onAnswer(questionId, null);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }

  if (questions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <MessageCircleQuestion className="size-4 text-primary" aria-hidden="true" />
          Questions for You
          {unanswered.length > 0 && (
            <Badge variant="default" className="ml-auto text-[10px] h-5">
              {unanswered.length} pending
            </Badge>
          )}
        </h3>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        {/* Unanswered questions */}
        {unanswered.map((q) => (
          <div
            key={q.id}
            className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2"
          >
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0 text-[10px] h-5">
                {getSpecialistLabel(q.specialist)}
              </Badge>
              <p className="text-sm leading-relaxed flex-1">{q.question}</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Type your answer..."
                value={drafts[q.id] || ''}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit(q.id);
                  }
                }}
                className="text-sm h-8"
                aria-label={`Answer for: ${q.question}`}
              />
              <Button
                size="xs"
                onClick={() => handleSubmit(q.id)}
                disabled={!drafts[q.id]?.trim()}
                aria-label="Submit answer"
              >
                <Send className="size-3" />
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => handleNA(q.id)}
                aria-label="Mark as not applicable"
              >
                <Minus className="size-3" />
                N/A
              </Button>
            </div>
          </div>
        ))}

        {/* Answered questions */}
        {answered.length > 0 && unanswered.length > 0 && <Separator />}
        {answered.map((q) => (
          <div key={q.id} className="rounded-md border p-3 opacity-70">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-500 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{q.question}</p>
                <p className="text-sm mt-0.5">
                  {q.answer === null ? (
                    <span className="italic text-muted-foreground">N/A</span>
                  ) : (
                    q.answer
                  )}
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
