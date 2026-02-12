import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasteBox } from '@/components/PasteBox';

describe('PasteBox', () => {
  const onSubmit = vi.fn();

  beforeEach(() => {
    onSubmit.mockClear();
  });

  it('should render the textarea and submit button', () => {
    render(<PasteBox onSubmit={onSubmit} isAnalyzing={false} />);

    expect(screen.getByRole('textbox', { name: /clinical notes input/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analyze case/i })).toBeInTheDocument();
  });

  it('should disable submit button when textarea is empty', () => {
    render(<PasteBox onSubmit={onSubmit} isAnalyzing={false} />);

    const button = screen.getByRole('button', { name: /analyze case/i });
    expect(button).toBeDisabled();
  });

  it('should enable submit button when text is entered', async () => {
    const user = userEvent.setup();
    render(<PasteBox onSubmit={onSubmit} isAnalyzing={false} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Patient data here');

    const button = screen.getByRole('button', { name: /analyze case/i });
    expect(button).not.toBeDisabled();
  });

  it('should call onSubmit with trimmed text on button click', async () => {
    const user = userEvent.setup();
    render(<PasteBox onSubmit={onSubmit} isAnalyzing={false} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, '  Patient notes  ');

    const button = screen.getByRole('button', { name: /analyze case/i });
    await user.click(button);

    expect(onSubmit).toHaveBeenCalledWith('Patient notes');
  });

  it('should show word count when text is entered', async () => {
    const user = userEvent.setup();
    render(<PasteBox onSubmit={onSubmit} isAnalyzing={false} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'one two three four five');

    expect(screen.getByText('5 words')).toBeInTheDocument();
  });

  it('should not show word count when empty', () => {
    render(<PasteBox onSubmit={onSubmit} isAnalyzing={false} />);

    expect(screen.queryByText(/words/)).not.toBeInTheDocument();
  });

  it('should show analyzing state when isAnalyzing is true', () => {
    render(<PasteBox onSubmit={onSubmit} isAnalyzing={true} />);

    expect(screen.getByText(/analyzing case/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('should disable textarea when analyzing', () => {
    render(<PasteBox onSubmit={onSubmit} isAnalyzing={true} />);

    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('should show clear button when text is entered and not analyzing', async () => {
    const user = userEvent.setup();
    render(<PasteBox onSubmit={onSubmit} isAnalyzing={false} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Some text');

    expect(screen.getByRole('button', { name: /clear notes/i })).toBeInTheDocument();
  });

  it('should clear text when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<PasteBox onSubmit={onSubmit} isAnalyzing={false} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Some text');

    const clearButton = screen.getByRole('button', { name: /clear notes/i });
    await user.click(clearButton);

    expect(textarea).toHaveValue('');
  });

  it('should not show clear button when analyzing', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<PasteBox onSubmit={onSubmit} isAnalyzing={false} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Some text');

    rerender(<PasteBox onSubmit={onSubmit} isAnalyzing={true} />);

    expect(screen.queryByRole('button', { name: /clear notes/i })).not.toBeInTheDocument();
  });

  it('should submit on Ctrl+Enter', async () => {
    const user = userEvent.setup();
    render(<PasteBox onSubmit={onSubmit} isAnalyzing={false} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Quick notes');
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(onSubmit).toHaveBeenCalledWith('Quick notes');
  });

  it('should not submit on plain Enter', async () => {
    const user = userEvent.setup();
    render(<PasteBox onSubmit={onSubmit} isAnalyzing={false} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Notes');
    await user.keyboard('{Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
