import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function formatCost(inputTokens: number, outputTokens: number): string {
  // Sonnet: $3/M input, $15/M output; Opus: $15/M input, $75/M output
  const inputCost = (inputTokens / 1_000_000) * 5;
  const outputCost = (outputTokens / 1_000_000) * 25;
  return `~$${(inputCost + outputCost).toFixed(3)}`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}
