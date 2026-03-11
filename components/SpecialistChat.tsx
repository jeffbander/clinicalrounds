'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Send, MessageCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Specialist, SPECIALIST_CONFIG } from '@/lib/types';
import type { SpecialistChatMessage, SpecialistAnalysis, CrossConsultMessage } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SpecialistChatProps {
  chatHistory: SpecialistChatMessage[];
  analyses: Record<string, SpecialistAnalysis>;
  onSendMessage: (specialist: Specialist, message: string) => void;
  isProcessing: boolean;
}

export function SpecialistChat({ chatHistory, analyses, onSendMessage, isProcessing }: SpecialistChatProps) {
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist>(Specialist.ATTENDING);
  const [inputMessage, setInputMessage] = useState('');
  const [expandedDiscussions, setExpandedDiscussions] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const availableSpecialists = Object.values(Specialist).filter(
    (s) => analyses[s] !== undefined
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory.length]);

  function handleSend() {
    const trimmed = inputMessage.trim();
    if (!trimmed || isProcessing) return;
    onSendMessage(selectedSpecialist, trimmed);
    setInputMessage('');
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function toggleDiscussion(messageId: string) {
    setExpandedDiscussions((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }

  return (
    <div className="rounded-lg border bg-card flex flex-col h-[500px]">
      {/* Header with specialist selector */}
      <div className="px-4 py-3 border-b flex items-center gap-3">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Specialist Q&A</h3>
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="specialist-select" className="text-xs text-muted-foreground">
            Ask:
          </label>
          <select
            id="specialist-select"
            value={selectedSpecialist}
            onChange={(e) => setSelectedSpecialist(e.target.value as Specialist)}
            className="text-xs border rounded-md px-2 py-1 bg-background"
          >
            {availableSpecialists.map((s) => {
              const config = SPECIALIST_CONFIG[s];
              return (
                <option key={s} value={s}>
                  {config.icon} {config.name}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Chat messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-3">
          {chatHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                Ask any specialist a follow-up question about this case
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Select a specialist above and type your question below
              </p>
            </div>
          ) : (
            chatHistory.map((msg) => {
              const isUser = msg.role === 'user';
              const specialistConfig = msg.specialist ? SPECIALIST_CONFIG[msg.specialist] : null;
              const hasTriggered = msg.triggered_discussions && msg.triggered_discussions.length > 0;
              const isExpanded = expandedDiscussions.has(msg.id);

              return (
                <div key={msg.id}>
                  <div
                    className={cn(
                      'flex gap-2.5',
                      isUser ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {/* Specialist icon (left side) */}
                    {!isUser && specialistConfig && (
                      <div className="shrink-0 mt-0.5 text-base" aria-hidden="true">
                        {specialistConfig.icon}
                      </div>
                    )}

                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg px-3 py-2',
                        isUser
                          ? 'bg-primary/10 text-foreground'
                          : 'bg-muted text-foreground'
                      )}
                    >
                      {/* Header */}
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-semibold">
                          {isUser ? 'You' : specialistConfig?.name ?? 'Specialist'}
                        </span>
                        {!isUser && msg.specialist && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {specialistConfig?.name}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Message content */}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>

                      {/* Triggered discussions */}
                      {hasTriggered && (
                        <Collapsible open={isExpanded} onOpenChange={() => toggleDiscussion(msg.id)}>
                          <CollapsibleTrigger asChild>
                            <button className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                              {isExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                              {msg.triggered_discussions!.length} triggered cross-consult{msg.triggered_discussions!.length !== 1 ? 's' : ''}
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-2 space-y-2 border-l-2 border-muted-foreground/20 pl-3">
                              {msg.triggered_discussions!.map((disc: CrossConsultMessage, idx: number) => {
                                const fromConfig = SPECIALIST_CONFIG[disc.from];
                                const toConfig = SPECIALIST_CONFIG[disc.to];
                                return (
                                  <div key={`${msg.id}-disc-${idx}`} className="text-xs space-y-1">
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <span>{fromConfig?.icon}</span>
                                      <span className="font-medium">{fromConfig?.name}</span>
                                      <span>asked</span>
                                      <span>{toConfig?.icon}</span>
                                      <span className="font-medium">{toConfig?.name}:</span>
                                    </div>
                                    <p className="text-muted-foreground italic">&quot;{disc.message}&quot;</p>
                                    {disc.response && (
                                      <p className="text-foreground/80">{disc.response}</p>
                                    )}
                                    {idx < msg.triggered_discussions!.length - 1 && (
                                      <Separator className="my-1" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t p-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${SPECIALIST_CONFIG[selectedSpecialist]?.name ?? 'specialist'} a question...`}
            disabled={isProcessing}
            rows={1}
            className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={isProcessing || !inputMessage.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {isProcessing && (
          <p className="text-xs text-muted-foreground mt-1 animate-pulse">
            {SPECIALIST_CONFIG[selectedSpecialist]?.name} is thinking...
          </p>
        )}
      </div>
    </div>
  );
}
