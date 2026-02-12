import { ShieldAlert } from 'lucide-react';

export function Disclaimer() {
  return (
    <div className="flex items-center justify-center gap-1.5 py-4 px-4">
      <ShieldAlert className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
      <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
        AI clinical reasoning aid only. Does not replace physician clinical judgment.
        Not for diagnostic or treatment decisions. All data stays in browser memory &mdash; nothing is stored.
      </p>
    </div>
  );
}
