import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Disclaimer } from '@/components/Disclaimer';

describe('Disclaimer', () => {
  it('should render the disclaimer text', () => {
    render(<Disclaimer />);

    expect(screen.getByText(/AI clinical reasoning aid only/i)).toBeInTheDocument();
  });

  it('should warn against diagnostic use', () => {
    render(<Disclaimer />);

    expect(screen.getByText(/Not for diagnostic or treatment decisions/i)).toBeInTheDocument();
  });

  it('should mention no storage', () => {
    render(<Disclaimer />);

    expect(screen.getByText(/nothing is stored/i)).toBeInTheDocument();
  });

  it('should mention browser-only data', () => {
    render(<Disclaimer />);

    expect(screen.getByText(/All data stays in browser memory/i)).toBeInTheDocument();
  });
});
