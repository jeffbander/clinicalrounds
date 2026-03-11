'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface AddNotesPanelProps {
  onAppend: (text: string) => void;
  isProcessing: boolean;
}

export default function AddNotesPanel({ onAppend, isProcessing }: AddNotesPanelProps) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAppend(trimmed);
    setText('');
  };

  return (
    <div className="space-y-3 border border-zinc-800 rounded-lg p-4 bg-zinc-950/50">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-300">Add Follow-up Notes</h4>
        <span className="text-[10px] text-zinc-600">
          Paste additional progress notes, labs, or imaging
        </span>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste additional clinical notes here (e.g., new progress note, updated labs, imaging results)..."
        className="min-h-[100px] text-sm bg-zinc-900/50 border-zinc-800 placeholder:text-zinc-600 resize-y"
        disabled={isProcessing}
      />

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-zinc-600 max-w-[70%]">
          New notes will be parsed, merged into the timeline, and specialists will re-analyze with updated data.
        </p>
        <Button
          onClick={handleSubmit}
          disabled={!text.trim() || isProcessing}
          size="sm"
          variant="outline"
          className="text-xs"
        >
          {isProcessing ? 'Processing...' : 'Add to Timeline'}
        </Button>
      </div>
    </div>
  );
}
