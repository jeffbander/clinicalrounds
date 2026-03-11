'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SPECIALIST_CONFIG, Specialist } from '@/lib/types';
import type { DiscussionMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';

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
      <div className="rounded-xl border bg-card p-8 text-center">
        <div className="p-3 bg-muted rounded-full inline-flex mb-3">
          <MessageSquare className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Cross-consultation discussion will appear here as specialists confer.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden animate-fade-in">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <MessageSquare className="size-4 text-muted-foreground" />
          Team Discussion
          <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {messages.length}
          </span>
        </h3>
      </div>
      <ScrollArea className="h-[400px]">
        <div className="p-4 space-y-2" role="log" aria-label="Team discussion thread" aria-live="polite">
          {messages.map((msg, i) => {
            const { icon, label } = getSpecialistDisplay(msg.specialist);

            return (
              <div
                key={`${msg.specialist}-${msg.timestamp}-${i}`}
                className="flex gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="shrink-0 mt-0.5 flex items-center justify-center size-7 rounded-md bg-muted text-sm" aria-hidden="true">
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
                  <p className="text-sm leading-relaxed mt-0.5 text-foreground/85">
                    {msg.content}
                  </p>
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
