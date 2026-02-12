import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CriticalAlert } from '@/components/CriticalAlert';
import { Specialist } from '@/lib/types';

describe('CriticalAlert', () => {
  it('should return null when no alerts', () => {
    const { container } = render(<CriticalAlert alerts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should show alert count in collapsed state', () => {
    const alerts = [
      { specialist: Specialist.CARDIOLOGIST, detail: 'Troponin rising, rule out STEMI' },
      { specialist: Specialist.NEPHROLOGIST, detail: 'Hyperkalemia' },
    ];

    render(<CriticalAlert alerts={alerts} />);

    expect(screen.getByText('2 Critical Alerts')).toBeInTheDocument();
  });

  it('should use singular "Alert" for single alert', () => {
    const alerts = [
      { specialist: Specialist.CARDIOLOGIST, detail: 'Troponin rising' },
    ];

    render(<CriticalAlert alerts={alerts} />);

    expect(screen.getByText('1 Critical Alert')).toBeInTheDocument();
  });

  it('should not show details when collapsed', () => {
    const alerts = [
      { specialist: Specialist.CARDIOLOGIST, detail: 'Troponin rising, rule out STEMI' },
    ];

    render(<CriticalAlert alerts={alerts} />);

    expect(screen.queryByText(/Troponin rising/)).not.toBeInTheDocument();
  });

  it('should expand to show details on click', async () => {
    const user = userEvent.setup();
    const alerts = [
      { specialist: Specialist.CARDIOLOGIST, detail: 'Troponin rising, rule out STEMI' },
    ];

    render(<CriticalAlert alerts={alerts} />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText(/Troponin rising, rule out STEMI/)).toBeInTheDocument();
    expect(screen.getByText(/Cardiology/)).toBeInTheDocument();
  });

  it('should show multiple alert details when expanded', async () => {
    const user = userEvent.setup();
    const alerts = [
      { specialist: Specialist.CARDIOLOGIST, detail: 'Cardiac alert' },
      { specialist: Specialist.NEPHROLOGIST, detail: 'Renal alert' },
      { specialist: Specialist.PHARMACIST, detail: 'Drug interaction' },
    ];

    render(<CriticalAlert alerts={alerts} />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText(/Cardiac alert/)).toBeInTheDocument();
    expect(screen.getByText(/Renal alert/)).toBeInTheDocument();
    expect(screen.getByText(/Drug interaction/)).toBeInTheDocument();
  });

  it('should have accessible alert role', () => {
    const alerts = [
      { specialist: Specialist.CARDIOLOGIST, detail: 'Alert content' },
    ];

    render(<CriticalAlert alerts={alerts} />);

    const alertRegion = screen.getByRole('alert', { name: /critical clinical findings/i });
    expect(alertRegion).toBeInTheDocument();
  });

  it('should fall back to raw specialist name for unknown specialist', async () => {
    const user = userEvent.setup();
    const alerts = [
      { specialist: 'unknown_specialist', detail: 'Unknown detail' },
    ];

    render(<CriticalAlert alerts={alerts} />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText(/unknown_specialist/)).toBeInTheDocument();
  });
});
