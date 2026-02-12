import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return healthy when ANTHROPIC_API_KEY is set', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test-key';

    const res = await GET();
    const data = await res.json();

    expect(data.status).toBe('healthy');
    expect(data.checks.anthropic_key).toBe('configured');
    expect(data.timestamp).toBeDefined();
  });

  it('should return degraded when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const res = await GET();
    const data = await res.json();

    expect(data.status).toBe('degraded');
    expect(data.checks.anthropic_key).toBe('missing');
  });

  it('should include a valid ISO timestamp', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test';

    const res = await GET();
    const data = await res.json();

    const parsed = new Date(data.timestamp);
    expect(parsed.toISOString()).toBe(data.timestamp);
  });
});
