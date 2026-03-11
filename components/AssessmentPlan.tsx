'use client';

import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Copy, Check, Loader2, ClipboardList, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssessmentPlanProps {
  plan: string;
  isStreaming: boolean;
}

export function AssessmentPlan({ plan, isStreaming }: AssessmentPlanProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(plan);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in some contexts
    }
  }

  return (
    <Card className="shadow-sm overflow-hidden animate-fade-in-up">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-muted/30 border-b">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <div className="p-1 bg-primary/10 rounded-md">
            <ClipboardList className="size-4 text-primary" aria-hidden="true" />
          </div>
          Assessment &amp; Plan
          {isStreaming && (
            <span className="relative flex size-2 ml-1">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
          )}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={!plan || isStreaming}
          className="gap-1.5 press-scale text-xs"
          aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard for Epic'}
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Copy for Epic
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {!plan && !isStreaming ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="p-3 bg-muted rounded-full mb-3">
              <FileText className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              The synthesized assessment and plan will appear here after all specialists complete their review.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[80vh]">
            <div className="p-5">
              <pre
                className={cn(
                  'whitespace-pre-wrap font-mono text-[13px] leading-[1.7] text-foreground/90'
                )}
                role="region"
                aria-label="Synthesized assessment and plan"
                aria-live="polite"
              >
                {plan}
                {isStreaming && (
                  <span className="inline-flex items-center ml-1">
                    <span className="inline-block w-[2px] h-[14px] bg-primary animate-pulse" />
                  </span>
                )}
              </pre>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
