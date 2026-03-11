'use client';

import { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ClipboardPaste, FileText, Loader2, X, Search, AlertCircle } from 'lucide-react';

const MIN_WORD_COUNT = 100;

interface PasteBoxProps {
  onSubmit: (text: string) => void;
  isAnalyzing: boolean;
  webSearchEnabled?: boolean;
  onToggleWebSearch?: (enabled: boolean) => void;
}

export function PasteBox({ onSubmit, isAnalyzing, webSearchEnabled, onToggleWebSearch }: PasteBoxProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const belowMinimum = wordCount > 0 && wordCount < MIN_WORD_COUNT;

  function handleSubmit() {
    if (text.trim().length > 0 && wordCount >= MIN_WORD_COUNT) {
      onSubmit(text.trim());
    }
  }

  function handleClear() {
    setText('');
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label
          htmlFor="clinical-notes"
          className="text-sm font-medium flex items-center gap-1.5"
        >
          <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
          Clinical Notes
        </label>
        {wordCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {wordCount.toLocaleString()} words
          </span>
        )}
      </div>
      <div className="relative">
        <Textarea
          ref={textareaRef}
          id="clinical-notes"
          placeholder="Paste Epic notes here — H&P, progress notes, labs, imaging, med list, consult notes. Supports multi-note paste..."
          className="min-h-[280px] font-mono text-[13px] leading-relaxed resize-y"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isAnalyzing}
          aria-label="Clinical notes input"
        />
        {text.length > 0 && !isAnalyzing && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            onClick={handleClear}
            aria-label="Clear notes"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
      {belowMinimum && (
        <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          <AlertCircle className="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Need more data — at least {MIN_WORD_COUNT} words required for meaningful analysis.
            Currently: {wordCount} words.
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleSubmit}
          disabled={isAnalyzing || wordCount < MIN_WORD_COUNT}
          className="flex-1 h-10"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Analyzing case...
            </>
          ) : (
            <>
              <ClipboardPaste className="size-4" aria-hidden="true" />
              Analyze Case
            </>
          )}
        </Button>
      </div>
      {onToggleWebSearch && (
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={webSearchEnabled ?? false}
            onChange={(e) => onToggleWebSearch(e.target.checked)}
            disabled={isAnalyzing}
            className="rounded border-border text-primary focus:ring-primary/30 h-3.5 w-3.5"
          />
          <Search className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">
            Enable web search for current guidelines
          </span>
        </label>
      )}
      <p className="text-[11px] text-muted-foreground text-center">
        Ctrl+Enter to submit &middot; Paste multiple notes at once for best results
      </p>
    </div>
  );
}
