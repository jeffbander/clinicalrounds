'use client';

import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Copy, Check, Loader2, ClipboardList } from 'lucide-react';
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
    <Card>
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <ClipboardList className="size-4 text-primary" aria-hidden="true" />
          Assessment &amp; Plan
        </h2>
        <Button
          variant="outline"
          size="xs"
          onClick={handleCopy}
          disabled={!plan || isStreaming}
          className="gap-1"
          aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard for Epic'}
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3" />
              Copy for Epic
            </>
          )}
        </Button>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        {!plan && !isStreaming ? (
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              The synthesized assessment and plan will appear here after all specialists complete their review.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[80vh]">
            <div className="p-4">
              <pre
                className={cn(
                  'whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-foreground/90',
                  isStreaming && 'animate-pulse'
                )}
                role="region"
                aria-label="Synthesized assessment and plan"
                aria-live="polite"
              >
                {plan}
                {isStreaming && (
                  <span className="inline-flex items-center ml-1">
                    <Loader2 className="size-3 animate-spin text-primary" aria-hidden="true" />
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
