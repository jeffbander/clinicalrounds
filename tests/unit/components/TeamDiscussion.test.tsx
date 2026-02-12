import React from 'react';
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TeamDiscussion } from '@/components/TeamDiscussion';
import { MOCK_DISCUSSION_MESSAGES } from '../../fixtures/clinical-data';
import { Specialist } from '@/lib/types';
import type { DiscussionMessage } from '@/lib/types';

// jsdom does not implement scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});

describe('TeamDiscussion', () => {
  it('should show empty state when no messages', () => {
    render(<TeamDiscussion messages={[]} />);

    expect(screen.getByText(/cross-consultation discussion will appear here/i)).toBeInTheDocument();
  });

  it('should render messages with specialist names', () => {
    render(<TeamDiscussion messages={MOCK_DISCUSSION_MESSAGES} />);

    expect(screen.getByText('Attending')).toBeInTheDocument();
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText('Nephrology')).toBeInTheDocument();
  });

  it('should display message content', () => {
    render(<TeamDiscussion messages={MOCK_DISCUSSION_MESSAGES} />);

    expect(screen.getByText(/Acute decompensated CHF/)).toBeInTheDocument();
    expect(screen.getByText(/Elevated BNP, EF 30%/)).toBeInTheDocument();
  });

  it('should show message count', () => {
    render(<TeamDiscussion messages={MOCK_DISCUSSION_MESSAGES} />);

    expect(screen.getByText(`(${MOCK_DISCUSSION_MESSAGES.length} messages)`)).toBeInTheDocument();
  });

  it('should show timestamps', () => {
    const now = Date.now();
    const messages: DiscussionMessage[] = [
      { specialist: Specialist.ATTENDING, content: 'Test message', timestamp: now },
    ];

    render(<TeamDiscussion messages={messages} />);

    // Should show time formatted as HH:MM
    const timeString = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    expect(screen.getByText(timeString)).toBeInTheDocument();
  });

  it('should have accessible log role', () => {
    render(<TeamDiscussion messages={MOCK_DISCUSSION_MESSAGES} />);

    expect(screen.getByRole('log', { name: /team discussion thread/i })).toBeInTheDocument();
  });

  it('should use fallback icon for unknown specialist', () => {
    const messages: DiscussionMessage[] = [
      { specialist: 'unknown_person', content: 'Unknown message', timestamp: Date.now() },
    ];

    render(<TeamDiscussion messages={messages} />);

    expect(screen.getByText('unknown_person')).toBeInTheDocument();
  });
});
