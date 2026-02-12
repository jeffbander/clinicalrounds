import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestionPanel } from '@/components/QuestionPanel';
import { MOCK_USER_QUESTIONS } from '../../fixtures/clinical-data';
import type { UserQuestion } from '@/lib/types';

describe('QuestionPanel', () => {
  const onAnswer = vi.fn();

  beforeEach(() => {
    onAnswer.mockClear();
  });

  it('should return null when no questions', () => {
    const { container } = render(<QuestionPanel questions={[]} onAnswer={onAnswer} />);
    expect(container.firstChild).toBeNull();
  });

  it('should show unanswered questions', () => {
    render(<QuestionPanel questions={MOCK_USER_QUESTIONS} onAnswer={onAnswer} />);

    expect(screen.getByText(MOCK_USER_QUESTIONS[0].question)).toBeInTheDocument();
    expect(screen.getByText(MOCK_USER_QUESTIONS[1].question)).toBeInTheDocument();
  });

  it('should show pending count badge', () => {
    render(<QuestionPanel questions={MOCK_USER_QUESTIONS} onAnswer={onAnswer} />);

    expect(screen.getByText(`${MOCK_USER_QUESTIONS.length} pending`)).toBeInTheDocument();
  });

  it('should show specialist labels for questions', () => {
    render(<QuestionPanel questions={MOCK_USER_QUESTIONS} onAnswer={onAnswer} />);

    // The attending specialist displays as "Attending"
    expect(screen.getByText('Attending')).toBeInTheDocument();
    expect(screen.getByText('Nephrology')).toBeInTheDocument();
  });

  it('should submit answer on button click', async () => {
    const user = userEvent.setup();
    render(<QuestionPanel questions={MOCK_USER_QUESTIONS} onAnswer={onAnswer} />);

    const inputs = screen.getAllByPlaceholderText('Type your answer...');
    await user.type(inputs[0], 'Yes, changed meds');

    const submitButtons = screen.getAllByRole('button', { name: /submit answer/i });
    await user.click(submitButtons[0]);

    expect(onAnswer).toHaveBeenCalledWith('q1', 'Yes, changed meds');
  });

  it('should submit answer on Enter key', async () => {
    const user = userEvent.setup();
    render(<QuestionPanel questions={MOCK_USER_QUESTIONS} onAnswer={onAnswer} />);

    const inputs = screen.getAllByPlaceholderText('Type your answer...');
    await user.type(inputs[0], 'Answer text');
    await user.keyboard('{Enter}');

    expect(onAnswer).toHaveBeenCalledWith('q1', 'Answer text');
  });

  it('should mark as N/A on N/A button click', async () => {
    const user = userEvent.setup();
    render(<QuestionPanel questions={MOCK_USER_QUESTIONS} onAnswer={onAnswer} />);

    const naButtons = screen.getAllByRole('button', { name: /mark as not applicable/i });
    await user.click(naButtons[0]);

    expect(onAnswer).toHaveBeenCalledWith('q1', null);
  });

  it('should disable submit button when input is empty', () => {
    render(<QuestionPanel questions={MOCK_USER_QUESTIONS} onAnswer={onAnswer} />);

    const submitButtons = screen.getAllByRole('button', { name: /submit answer/i });
    for (const btn of submitButtons) {
      expect(btn).toBeDisabled();
    }
  });

  it('should show answered questions with checkmark', () => {
    const answeredQuestions: UserQuestion[] = [
      { ...MOCK_USER_QUESTIONS[0], answer: 'Yes, stopped lisinopril' },
      MOCK_USER_QUESTIONS[1],
    ];

    render(<QuestionPanel questions={answeredQuestions} onAnswer={onAnswer} />);

    expect(screen.getByText('Yes, stopped lisinopril')).toBeInTheDocument();
  });

  it('should show N/A for null answers', () => {
    // Both questions answered - one with text, one with null
    const answeredQuestions: UserQuestion[] = [
      { ...MOCK_USER_QUESTIONS[0], answer: null },
      { ...MOCK_USER_QUESTIONS[1], answer: 'Cr was 1.2' },
    ];

    render(<QuestionPanel questions={answeredQuestions} onAnswer={onAnswer} />);

    // The italic N/A text inside the answered question display
    const naText = screen.getByText('N/A');
    expect(naText).toBeInTheDocument();
    expect(naText.tagName).toBe('SPAN');
  });

  it('should clear draft after submitting', async () => {
    const user = userEvent.setup();
    render(<QuestionPanel questions={MOCK_USER_QUESTIONS} onAnswer={onAnswer} />);

    const inputs = screen.getAllByPlaceholderText('Type your answer...');
    await user.type(inputs[0], 'My answer');

    const submitButtons = screen.getAllByRole('button', { name: /submit answer/i });
    await user.click(submitButtons[0]);

    // After submission, the input for that question should be empty
    expect(inputs[0]).toHaveValue('');
  });

  it('should have aria-labels on inputs', () => {
    render(<QuestionPanel questions={MOCK_USER_QUESTIONS} onAnswer={onAnswer} />);

    const input = screen.getByLabelText(`Answer for: ${MOCK_USER_QUESTIONS[0].question}`);
    expect(input).toBeInTheDocument();
  });
});
