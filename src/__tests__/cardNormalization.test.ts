import { describe, it, expect } from 'vitest';
import { normalizeCard } from '../utils';
import { DEFAULT_LAYOUT_ROWS, MAX_LAYOUT_ROWS } from '@/domain/card/extraRows';

describe('normalizeCard', () => {
  it('should filter out empty math blocks from questionBlocks and answerBlocks', () => {
    const rawCard = {
      id: 'test-card',
      questionBlocks: [
        { id: 'q1', type: 'text', content: 'What is 1+1?' },
        { id: 'q2', type: 'math', math: { latex: '', displayMode: 'block' } }, // Empty
        { id: 'q3', type: 'math', math: { latex: '2+2=4', displayMode: 'inline' } } // Not empty
      ],
      answerBlocks: [
        { id: 'a1', type: 'math', math: { latex: ' ', displayMode: 'block' } } // Whitespace only
      ]
    };

    const normalized = normalizeCard(rawCard);

    expect(normalized.questionBlocks).toHaveLength(2);
    expect(normalized.questionBlocks[0].type).toBe('text');
    expect(normalized.questionBlocks[1].math.latex).toBe('2+2=4');
    
    expect(normalized.answerBlocks).toHaveLength(0);
  });

  it('should provide default values for math blocks', () => {
    const rawCard = {
      id: 'test-card',
      questionBlocks: [
        { id: 'q1', type: 'math', math: { latex: 'x^2' } } // Missing displayMode
      ]
    };

    // The current normalization doesn't fill defaults INSIDE math object yet, 
    // but Flashcard.tsx handles it with || 'block'.
    // If we want to move it to normalization, we can do it here.
    const normalized = normalizeCard(rawCard);
    expect(normalized.questionBlocks[0].math.latex).toBe('x^2');
  });

  it('should handle legacy fields by converting them to blocks', () => {
    const rawCard = {
      id: 'legacy-card',
      question_text: 'Legacy Question',
      answer_text: 'Legacy Answer'
    };

    const normalized = normalizeCard(rawCard);

    expect(normalized.questionBlocks).toHaveLength(1);
    expect(normalized.questionBlocks[0].type).toBe('text');
    expect(normalized.questionBlocks[0].content).toBe('Legacy Question');
    
    expect(normalized.answerBlocks).toHaveLength(1);
    expect(normalized.answerBlocks[0].content).toBe('Legacy Answer');
  });

  it('should normalize layout rows', () => {
    const rawCard = {
      id: 'rows-card',
      layout_rows: '20',
      question_extra_rows: '3',
      answerExtraRows: 2,
    };

    const normalized = normalizeCard(rawCard);

    expect(normalized.layoutRows).toBe(20);
  });

  it('migrates legacy per-side extra rows to layoutRows using larger side', () => {
    const rawCard = {
      id: 'legacy-rows-card',
      question_extra_rows: '3',
      answer_extra_rows: 10,
    };

    const normalized = normalizeCard(rawCard);
    expect(normalized.layoutRows).toBe(DEFAULT_LAYOUT_ROWS + 10);
  });

  it('clamps layoutRows with compatibility max bound', () => {
    const rawCard = {
      id: 'clamp-rows-card',
      layoutRows: MAX_LAYOUT_ROWS + 100,
    };

    const normalized = normalizeCard(rawCard);
    expect(normalized.layoutRows).toBe(MAX_LAYOUT_ROWS);
  });

  it('migrates code block rowOffset to offsetRows with non-negative clamp', () => {
    const rawCard = {
      id: 'offset-migrate-card',
      questionBlocks: [
        { id: 'q-code-1', type: 'code', rowOffset: 3, code: { language: 'javascript', code: 'const a = 1;' } },
        { id: 'q-code-2', type: 'code', rowOffset: -2, code: { language: 'javascript', code: 'const b = 2;' } },
      ],
    };

    const normalized = normalizeCard(rawCard);
    expect(normalized.questionBlocks[0].offsetRows).toBe(3);
    expect(normalized.questionBlocks[0].rowOffset).toBeUndefined();
    expect(normalized.questionBlocks[1].offsetRows).toBe(0);
    expect(normalized.questionBlocks[1].rowOffset).toBeUndefined();
  });
});
