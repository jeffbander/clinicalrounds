import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cn, copyToClipboard, formatCost, generateId } from '@/lib/utils';

describe('cn (className merger)', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('should deduplicate tailwind classes', () => {
    const result = cn('p-4', 'p-2');
    expect(result).toBe('p-2');
  });

  it('should handle undefined and null inputs', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });
});

describe('copyToClipboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true on successful copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    const result = await copyToClipboard('test text');
    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith('test text');
  });

  it('should return false when clipboard API fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      writable: true,
      configurable: true,
    });

    const result = await copyToClipboard('test text');
    expect(result).toBe(false);
  });
});

describe('formatCost', () => {
  it('should format zero tokens as ~$0.000', () => {
    expect(formatCost(0, 0)).toBe('~$0.000');
  });

  it('should calculate cost based on blended rates', () => {
    // At $5/M input, $25/M output
    // 1M input = $5, 1M output = $25
    const result = formatCost(1_000_000, 1_000_000);
    expect(result).toBe('~$30.000');
  });

  it('should format small token counts', () => {
    // 10k input = $0.05, 5k output = $0.125
    const result = formatCost(10_000, 5_000);
    expect(result).toBe('~$0.175');
  });

  it('should handle large token counts', () => {
    const result = formatCost(500_000, 200_000);
    // 500k * 5/M = $2.50, 200k * 25/M = $5.00
    expect(result).toBe('~$7.500');
  });
});

describe('generateId', () => {
  it('should return a non-empty string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('should generate unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('should return alphanumeric characters', () => {
    const id = generateId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });

  it('should return an 8-character string', () => {
    const id = generateId();
    expect(id.length).toBe(8);
  });
});
