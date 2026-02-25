// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { BlockRenderer } from '../BlockRenderer';
import { CodeBlockEditor } from '../CodeBlockEditor';
import { MarkdownBlockView } from '../blocks/MarkdownBlockPreview';
import type { CardBlock } from '@/types';

afterEach(() => {
  cleanup();
});

const LONG_LINE = `const veryLongLine = "${'x'.repeat(240)}";`;

describe('Code block consistency', () => {
  it('long single-line code keeps no-wrap and horizontal scroll classes', () => {
    const { container } = render(
      <BlockRenderer
        blocks={[
          {
            id: 'code-1',
            type: 'code',
            orderIndex: 0,
            code: { language: 'javascript', code: LONG_LINE },
          } as CardBlock,
        ]}
      />
    );

    const pre = container.querySelector('pre');
    const code = container.querySelector('pre code');
    expect(pre).toBeTruthy();
    expect(code).toBeTruthy();
    expect(pre?.className ?? '').toContain('overflow-x-auto');
    expect(pre?.className ?? '').toContain('whitespace-pre');
    expect(pre?.className ?? '').toContain('break-normal');
    expect(code?.className ?? '').toContain('whitespace-pre');
    expect(code?.textContent ?? '').toContain(LONG_LINE);
  });

  it('editor/view/preview use the same CodeBlockFrame structure', () => {
    const edit = render(
      <CodeBlockEditor
        value={{ language: 'javascript', code: 'const a = 1;' }}
        onChange={() => {}}
      />
    );
    const view = render(
      <BlockRenderer
        blocks={[
          {
            id: 'code-2',
            type: 'code',
            orderIndex: 0,
            code: { language: 'javascript', code: 'const b = 2;' },
          } as CardBlock,
        ]}
      />
    );
    const preview = render(
      <MarkdownBlockView md={'```javascript\nconst c = 3;\n```'} />
    );

    const editRoot = edit.container.querySelector('.codeBlockRoot');
    const viewRoot = view.container.querySelector('.codeBlockRoot');
    const previewRoot = preview.container.querySelector('.codeBlockRoot');
    expect(editRoot).toBeTruthy();
    expect(viewRoot).toBeTruthy();
    expect(previewRoot).toBeTruthy();

    expect(edit.container.querySelector('.codeBlockPre.codeBlockPre--tools')).toBeTruthy();
    expect(view.container.querySelector('.codeBlockPre.codeBlockPre--tools')).toBeTruthy();
    expect(preview.container.querySelector('.codeBlockPre.codeBlockPre--tools')).toBeTruthy();

    expect(view.container.querySelector('.codeBlockLang')?.textContent).toBe('JavaScript');
    expect(preview.container.querySelector('.codeBlockLang')?.textContent).toBe('JavaScript');
    expect(edit.container.querySelector('.codeBlockLang')).toBeNull();
  });
});
