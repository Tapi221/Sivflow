// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { BlockRenderer } from '../blocks/BlockRenderer';
import { MathBlockContent } from '../blocks/MathBlockContent';
import type { CardBlock } from '@/types';

describe('Math block consistency', () => {
  it('viewer and editor-preview path both use mathBlockRoot frame', () => {
    const view = render(
      <BlockRenderer
        blocks={[
          {
            id: 'math-1',
            type: 'math',
            orderIndex: 0,
            math: { latex: 'x^2+1', displayMode: 'block' },
          } as CardBlock,
        ]}
      />
    );

    const previewLike = render(
      <MathBlockContent latex={'x^2+1'} displayMode="block" />
    );

    expect(view.container.querySelector('.mathBlockRoot')).toBeTruthy();
    expect(previewLike.container.querySelector('.mathBlockRoot')).toBeTruthy();
  });
});

