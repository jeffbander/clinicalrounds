import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpecialistCard } from '@/components/SpecialistCard';
import { Specialist } from '@/lib/types';
import type { SpecialistAnalysis } from '@/lib/types';
import { createMockSpecialistAnalysis } from '../../fixtures/clinical-data';

describe('SpecialistCard', () => {
  const baseProps = {
    name: 'Cardiology',
    icon: '\u2764\uFE0F',
    status: 'waiting' as const,
  };

  it('should render specialist name and icon', () => {
    render(<SpecialistCard {...baseProps} />);

    expect(screen.getByText('Cardiology')).toBeInTheDocument();
  });

  it('should show waiting state', () => {
    render(<SpecialistCard {...baseProps} status="waiting" />);

    // The card header has aria-label with status
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-label', expect.stringContaining('waiting'));
  });

  it('should show analyzing state', () => {
    render(<SpecialistCard {...baseProps} status="analyzing" />);

    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-label', expect.stringContaining('analyzing'));
  });

  it('should show complete state', () => {
    const analysis = createMockSpecialistAnalysis(Specialist.CARDIOLOGIST);
    render(<SpecialistCard {...baseProps} status="complete" analysis={analysis} />);

    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-label', expect.stringContaining('complete'));
  });

  it('should expand to show findings when clicked', async () => {
    const user = userEvent.setup();
    const analysis = createMockSpecialistAnalysis(Specialist.CARDIOLOGIST);

    render(<SpecialistCard {...baseProps} status="complete" analysis={analysis} />);

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    expect(screen.getByText('Findings')).toBeInTheDocument();
    expect(screen.getByText('Finding 1 from cardiologist')).toBeInTheDocument();
  });

  it('should show concerns when expanded', async () => {
    const user = userEvent.setup();
    const analysis = createMockSpecialistAnalysis(Specialist.CARDIOLOGIST);

    render(<SpecialistCard {...baseProps} status="complete" analysis={analysis} />);

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    expect(screen.getByText('Concerns')).toBeInTheDocument();
    expect(screen.getByText(/High concern from cardiologist/)).toBeInTheDocument();
  });

  it('should show recommendations when expanded', async () => {
    const user = userEvent.setup();
    const analysis = createMockSpecialistAnalysis(Specialist.CARDIOLOGIST);

    render(<SpecialistCard {...baseProps} status="complete" analysis={analysis} />);

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Recommendation 1 from cardiologist')).toBeInTheDocument();
    expect(screen.getByText('(ACC/AHA 2022)')).toBeInTheDocument();  // rationale
  });

  it('should show critical concern styling', async () => {
    const user = userEvent.setup();
    const analysis = createMockSpecialistAnalysis(Specialist.CARDIOLOGIST, { hasCritical: true });

    render(<SpecialistCard {...baseProps} status="critical" analysis={analysis} />);

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    // Should have critical concern alert
    const criticalAlert = screen.getByText(/Critical concern from cardiologist/);
    expect(criticalAlert).toBeInTheDocument();
  });

  it('should show "Awaiting analysis..." when expanded in waiting state', async () => {
    const user = userEvent.setup();
    render(<SpecialistCard {...baseProps} status="waiting" />);

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    expect(screen.getByText('Awaiting analysis...')).toBeInTheDocument();
  });

  it('should show "Analyzing..." when expanded in analyzing state', async () => {
    const user = userEvent.setup();
    render(<SpecialistCard {...baseProps} status="analyzing" />);

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    expect(screen.getByText('Analyzing...')).toBeInTheDocument();
  });

  it('should toggle open state on click', async () => {
    const user = userEvent.setup();
    const analysis = createMockSpecialistAnalysis(Specialist.CARDIOLOGIST);

    render(<SpecialistCard {...baseProps} status="complete" analysis={analysis} />);

    const trigger = screen.getByRole('button');

    // Open
    await user.click(trigger);
    expect(screen.getByText('Findings')).toBeInTheDocument();

    // Close
    await user.click(trigger);
    expect(screen.queryByText('Findings')).not.toBeInTheDocument();
  });

  it('should not show findings section when empty', async () => {
    const user = userEvent.setup();
    const analysis = createMockSpecialistAnalysis(Specialist.CARDIOLOGIST);
    analysis.findings = [];

    render(<SpecialistCard {...baseProps} status="complete" analysis={analysis} />);

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    expect(screen.queryByText('Findings')).not.toBeInTheDocument();
  });

  it('should not show concerns section when empty', async () => {
    const user = userEvent.setup();
    const analysis = createMockSpecialistAnalysis(Specialist.CARDIOLOGIST);
    analysis.concerns = [];

    render(<SpecialistCard {...baseProps} status="complete" analysis={analysis} />);

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    expect(screen.queryByText('Concerns')).not.toBeInTheDocument();
  });

  it('should display severity badges in concerns', async () => {
    const user = userEvent.setup();
    const analysis = createMockSpecialistAnalysis(Specialist.CARDIOLOGIST, { hasCritical: true });

    render(<SpecialistCard {...baseProps} status="critical" analysis={analysis} />);

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    // The component renders the raw severity value; CSS uppercase class handles display
    expect(screen.getByText('critical')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
  });
});
