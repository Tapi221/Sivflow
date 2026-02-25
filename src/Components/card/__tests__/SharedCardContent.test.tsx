// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DragDropContext } from '@hello-pangea/dnd';
import { SharedCardContent } from '../SharedCardContent';
import type { CardBlock } from '@/types';

vi.mock('../BlockRenderer', () => ({
  BlockRenderer: () => <div data-testid="mock-block-renderer" />,
}));

vi.mock('../BlockEditor', () => ({
  BlockEditor: () => <div data-testid="mock-block-editor" />,
}));

describe('SharedCardContent', () => {
  const blocks: CardBlock[] = [
    { id: 'b-1', type: 'text', orderIndex: 0, content: 'hello' },
  ];

  it('renders view mode with shared root and card extra space', () => {
    const { container } = render(
      <SharedCardContent mode="view" blocks={blocks} extraRows={3} />
    );

    const root = container.querySelector('.card-content-root');
    const extra = container.querySelector('[data-card-extra-space="true"]') as HTMLElement | null;

    expect(root).toBeTruthy();
    expect(screen.getByTestId('mock-block-renderer')).toBeTruthy();
    expect(extra).toBeTruthy();
    expect(extra?.style.height).toBe('72px');
  });

  it('renders edit mode with the same shared root and card extra space', () => {
    const { container } = render(
      <DragDropContext onDragEnd={() => {}}>
        <SharedCardContent
          mode="edit"
          blocks={blocks}
          extraRows={2}
          onChange={() => {}}
          prefix="question"
          label="問題"
          color="text-indigo-500"
          droppableId="question-blocks"
        />
      </DragDropContext>
    );

    const root = container.querySelector('.card-content-root');
    const extra = container.querySelector('[data-card-extra-space="true"]') as HTMLElement | null;

    expect(root).toBeTruthy();
    expect(screen.getByTestId('mock-block-editor')).toBeTruthy();
    expect(extra).toBeTruthy();
    expect(extra?.style.height).toBe('48px');
  });
});
