import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpecialistGrid } from '@/components/SpecialistGrid';
import { Specialist, SPECIALIST_CONFIG } from '@/lib/types';
import type { AnalysisStatus } from '@/lib/types';
import { createMockAnalyses } from '../../fixtures/clinical-data';

describe('SpecialistGrid', () => {
  it('should render 9 specialist cards', () => {
    const statuses: Record<string, AnalysisStatus> = {};
    for (const s of Object.values(Specialist)) {
      statuses[s] = 'waiting';
    }

    render(<SpecialistGrid analyses={{}} statuses={statuses} />);

    // Check that known specialist names appear
    expect(screen.getByText('Attending')).toBeInTheDocument();
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText('Pulm/CC')).toBeInTheDocument();
    expect(screen.getByText('Nephrology')).toBeInTheDocument();
    expect(screen.getByText('Pharmacy')).toBeInTheDocument();
  });

  it('should show progress bar when specialists are analyzing', () => {
    const statuses: Record<string, AnalysisStatus> = {};
    for (const s of Object.values(Specialist)) {
      statuses[s] = 'analyzing';
    }

    render(<SpecialistGrid analyses={{}} statuses={statuses} />);

    expect(screen.getByText(/complete/)).toBeInTheDocument();
  });

  it('should show correct completion count', () => {
    const statuses: Record<string, AnalysisStatus> = {};
    for (const s of Object.values(Specialist)) {
      statuses[s] = 'waiting';
    }
    statuses[Specialist.ATTENDING] = 'complete';
    statuses[Specialist.CARDIOLOGIST] = 'critical';
    statuses[Specialist.PULMONOLOGIST] = 'analyzing';

    render(<SpecialistGrid analyses={createMockAnalyses()} statuses={statuses} />);

    // 2 complete (attending + cardiologist-critical counts), 1 analyzing -> progress bar shown
    expect(screen.getByText(/complete/)).toBeInTheDocument();
  });

  it('should not show progress bar when no specialists are analyzing', () => {
    const statuses: Record<string, AnalysisStatus> = {};
    for (const s of Object.values(Specialist)) {
      statuses[s] = 'complete';
    }

    render(<SpecialistGrid analyses={createMockAnalyses()} statuses={statuses} />);

    // No progress bar when isActive is false
    expect(screen.queryByText(/Specialist analysis/)).not.toBeInTheDocument();
  });

  it('should pass analysis data to specialist cards', () => {
    const analyses = createMockAnalyses();
    const statuses: Record<string, AnalysisStatus> = {};
    for (const s of Object.values(Specialist)) {
      statuses[s] = 'complete';
    }

    render(<SpecialistGrid analyses={analyses} statuses={statuses} />);

    // All specialist names should be present
    for (const s of [Specialist.ATTENDING, Specialist.CARDIOLOGIST, Specialist.PULMONOLOGIST,
      Specialist.NEPHROLOGIST, Specialist.HEPATOLOGIST, Specialist.HEMATOLOGIST,
      Specialist.ID_SPECIALIST, Specialist.RADIOLOGIST, Specialist.PHARMACIST]) {
      const config = SPECIALIST_CONFIG[s];
      expect(screen.getByText(config.name)).toBeInTheDocument();
    }
  });

  it('should have accessible region label', () => {
    const statuses: Record<string, AnalysisStatus> = {};
    for (const s of Object.values(Specialist)) {
      statuses[s] = 'waiting';
    }

    render(<SpecialistGrid analyses={{}} statuses={statuses} />);

    expect(screen.getByRole('region', { name: /specialist analyses/i })).toBeInTheDocument();
  });
});
