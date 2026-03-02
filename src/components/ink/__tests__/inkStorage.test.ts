// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearInkFromStorage,
  getInkStorageKey,
  loadInkFromStorage,
  saveInkToStorage,
} from '@/components/ink/inkStorage';
import { createEmptyInkDocument } from '@/components/ink/inkTypes';

describe('inkStorage', () => {
  const cardId = 'card-1';
  const side = 'question' as const;

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves and loads ink documents by card and side key', () => {
    const doc = {
      ...createEmptyInkDocument(),
      strokes: [
        {
          id: 's1',
          tool: 'pen' as const,
          color: '#111827',
          width: 3,
          opacity: 1,
          createdAt: 1,
          points: [{ x: 10, y: 20, t: 1, p: 0.5 }],
        },
      ],
    };

    saveInkToStorage(cardId, side, doc);
    const loaded = loadInkFromStorage(cardId, side);

    expect(window.localStorage.getItem(getInkStorageKey(cardId, side))).toBeTruthy();
    expect(loaded.strokes).toHaveLength(1);
    expect(loaded.strokes[0].id).toBe('s1');
  });

  it('falls back to provided document when key is absent', () => {
    const fallback = {
      ...createEmptyInkDocument(),
      strokes: [
        {
          id: 'fallback',
          tool: 'pen' as const,
          color: '#000000',
          width: 2,
          opacity: 1,
          createdAt: 1,
          points: [{ x: 1, y: 1, t: 1, p: 0.5 }],
        },
      ],
    };

    const loaded = loadInkFromStorage('missing', 'answer', fallback);
    expect(loaded.strokes[0].id).toBe('fallback');
  });

  it('clears stored key', () => {
    saveInkToStorage(cardId, side, createEmptyInkDocument());
    clearInkFromStorage(cardId, side);

    expect(window.localStorage.getItem(getInkStorageKey(cardId, side))).toBeNull();
  });
});
