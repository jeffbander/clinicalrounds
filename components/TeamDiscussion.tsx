'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { SPECIALIST_CONFIG, Specialist } from '@/lib/types';
import type { DiscussionMessage } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TeamDiscussionProps {
  messages: DiscussionMessage[];
}

function getSpecialistDisplay(name: string): { icon: string; label: string } {
  const specialist = Object.values(Specialist).find((s) => s === name);
  if (specialist && SPECIALIST_CONFIG[specialist]) {
    const config = SPECIALIST_CONFIG[specialist];
    return { icon: config.icon, label: config.name };
  }
  return { icon: '\u{1F4AC}', label: name };
}

export function TeamDiscussion({ messages }: TeamDiscussionProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Cross-consultation discussion will appear here as specialists confer.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          Team Discussion
          <span className="text-xs font-normal text-muted-foreground">
            ({messages.length} messages)
          </span>
        </h3>
      </div>
      <ScrollArea className="h-[400px]">
        <div className="p-4 space-y-3" role="log" aria-label="Team discussion thread" aria-live="polite">
          {messages.map((msg, i) => {
            const { icon, label } = getSpecialistDisplay(msg.specialist);
            const prevSpecialist = i > 0 ? messages[i - 1].specialist : null;
            const showSeparator = i > 0 && msg.specialist !== prevSpecialist;

            return (
              <div key={`${msg.specialist}-${msg.timestamp}-${i}`}>
                {showSeparator && <Separator className="my-2" />}
                <div className="flex gap-2.5">
                  <div className="shrink-0 mt-0.5 text-base" aria-hidden="true">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold">{label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed mt-0.5 text-foreground/90">
                      {msg.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
