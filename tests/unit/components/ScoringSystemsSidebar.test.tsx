import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoringSystemsSidebar } from '@/components/ScoringSystemsSidebar';
import { MOCK_SCORING_SYSTEMS } from '../../fixtures/clinical-data';

describe('ScoringSystemsSidebar', () => {
  it('should return null when no scores', () => {
    const { container } = render(<ScoringSystemsSidebar scores={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render scoring system names', () => {
    render(<ScoringSystemsSidebar scores={MOCK_SCORING_SYSTEMS} />);

    expect(screen.getByText('NYHA Class')).toBeInTheDocument();
    expect(screen.getByText('CHA2DS2-VASc')).toBeInTheDocument();
    expect(screen.getByText('MELD-Na')).toBeInTheDocument();
  });

  it('should render score values', () => {
    render(<ScoringSystemsSidebar scores={MOCK_SCORING_SYSTEMS} />);

    expect(screen.getByText('III')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('should render interpretations', () => {
    render(<ScoringSystemsSidebar scores={MOCK_SCORING_SYSTEMS} />);

    expect(screen.getByText('Marked limitation of physical activity')).toBeInTheDocument();
    expect(screen.getByText('High stroke risk - anticoagulation indicated')).toBeInTheDocument();
  });

  it('should show header with title', () => {
    render(<ScoringSystemsSidebar scores={MOCK_SCORING_SYSTEMS} />);

    expect(screen.getByText('Scoring Systems')).toBeInTheDocument();
  });

  it('should have accessible list role', () => {
    render(<ScoringSystemsSidebar scores={MOCK_SCORING_SYSTEMS} />);

    expect(screen.getByRole('list', { name: /applied clinical scoring systems/i })).toBeInTheDocument();
  });

  it('should render list items', () => {
    render(<ScoringSystemsSidebar scores={MOCK_SCORING_SYSTEMS} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(MOCK_SCORING_SYSTEMS.length);
  });
});
