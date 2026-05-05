'use client';

import { Stethoscope, Sparkles } from 'lucide-react';

export function LoadingAnimation() {
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <div className="flex items-center gap-3" aria-hidden="true">
        {/* Doctor icon */}
        <div className="p-2.5 bg-primary/10 rounded-xl">
          <Stethoscope className="size-5 text-primary" />
        </div>

        {/* Animated data-flow dots */}
        <div className="flex items-center gap-1">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="size-1.5 rounded-full bg-primary/40 motion-safe:animate-pulse"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>

        {/* AI icon */}
        <div className="p-2.5 bg-primary/10 rounded-xl motion-safe:animate-pulse">
          <Sparkles className="size-5 text-primary" />
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm font-medium">Parsing clinical notes...</p>
        <p className="text-xs text-muted-foreground mt-1">
          Extracting structured data from your notes
        </p>
      </div>
    </div>
  );
}
