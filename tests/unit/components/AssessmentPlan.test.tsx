import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssessmentPlan } from '@/components/AssessmentPlan';

describe('AssessmentPlan', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should show placeholder when no plan and not streaming', () => {
    render(<AssessmentPlan plan="" isStreaming={false} />);

    expect(screen.getByText(/synthesized assessment and plan will appear here/i)).toBeInTheDocument();
  });

  it('should show plan text when provided', () => {
    render(<AssessmentPlan plan="Problem 1: CHF\n- IV furosemide" isStreaming={false} />);

    expect(screen.getByText(/Problem 1: CHF/)).toBeInTheDocument();
  });

  it('should show streaming indicator when isStreaming is true', () => {
    render(<AssessmentPlan plan="Generating..." isStreaming={true} />);

    // The pre element should contain a blinking cursor indicator
    const pre = screen.getByRole('region', { name: /synthesized assessment and plan/i });
    expect(pre).toBeInTheDocument();
  });

  it('should show header with title', () => {
    render(<AssessmentPlan plan="" isStreaming={false} />);

    expect(screen.getByText(/Assessment/)).toBeInTheDocument();
  });

  it('should disable copy button when no plan', () => {
    render(<AssessmentPlan plan="" isStreaming={false} />);

    const copyButton = screen.getByRole('button', { name: /copy to clipboard for epic/i });
    expect(copyButton).toBeDisabled();
  });

  it('should disable copy button while streaming', () => {
    render(<AssessmentPlan plan="In progress..." isStreaming={true} />);

    const copyButton = screen.getByRole('button', { name: /copy to clipboard for epic/i });
    expect(copyButton).toBeDisabled();
  });

  it('should enable copy button when plan is complete', () => {
    render(<AssessmentPlan plan="Final plan text" isStreaming={false} />);

    const copyButton = screen.getByRole('button', { name: /copy to clipboard for epic/i });
    expect(copyButton).not.toBeDisabled();
  });

  it('should call clipboard API on copy click', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<AssessmentPlan plan="Copy me" isStreaming={false} />);

    const copyButton = screen.getByRole('button', { name: /copy to clipboard for epic/i });
    await user.click(copyButton);

    expect(writeText).toHaveBeenCalledWith('Copy me');
  });

  it('should show "Copied" text after successful copy', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<AssessmentPlan plan="Copy me" isStreaming={false} />);

    const copyButton = screen.getByRole('button', { name: /copy to clipboard for epic/i });
    await user.click(copyButton);

    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('should have aria-live region for accessibility', () => {
    render(<AssessmentPlan plan="Plan text" isStreaming={false} />);

    const region = screen.getByRole('region', { name: /synthesized assessment and plan/i });
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('should display plan as pre-formatted text', () => {
    render(<AssessmentPlan plan="Line 1\nLine 2" isStreaming={false} />);

    const pre = screen.getByRole('region', { name: /synthesized assessment and plan/i });
    expect(pre.tagName).toBe('PRE');
    expect(pre).toHaveClass('whitespace-pre-wrap');
  });
});
