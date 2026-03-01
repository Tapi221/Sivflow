// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarkdownBlock } from '@/Components/card/blocks/MarkdownBlock';

afterEach(() => {
  cleanup();
});

function StatefulMarkdownBlock({ initialMarkdown }: { initialMarkdown: string }) {
  const [markdown, setMarkdown] = React.useState(initialMarkdown);

  return (
    <MarkdownBlock
      markdown={markdown}
      onChange={setMarkdown}
      onDelete={() => {}}
      onDuplicate={() => {}}
    />
  );
}

describe('MarkdownBlock', () => {
  it('初期状態はプレビューだけで、textarea/dialogは存在しない', () => {
    render(<StatefulMarkdownBlock initialMarkdown="initial markdown" />);

    expect(screen.getByTestId('markdown-preview')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByLabelText('Markdown入力')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('「Markdownを編集」クリックでDialogが開き、textareaに現在値が入る', async () => {
    const user = userEvent.setup();
    const initialMarkdown = 'Current **Markdown**';
    render(<StatefulMarkdownBlock initialMarkdown={initialMarkdown} />);

    await user.click(screen.getByRole('button', { name: 'Markdownを編集' }));

    const dialog = await screen.findByRole('dialog', { name: /markdown editor/i });
    const textarea = within(dialog).getByLabelText('Markdown入力') as HTMLTextAreaElement;
    expect(textarea.value).toBe(initialMarkdown);
  });

  it('編集して閉じるとプレビューに反映され、Dialog/textareaはDOMから消える', async () => {
    const user = userEvent.setup();
    render(<StatefulMarkdownBlock initialMarkdown={'before'} />);

    await user.click(screen.getByRole('button', { name: 'Markdownを編集' }));
    const dialog = await screen.findByRole('dialog', { name: /markdown editor/i });
    const textarea = within(dialog).getByLabelText('Markdown入力') as HTMLTextAreaElement;

    await user.clear(textarea);
    await user.type(textarea, 'after update');
    await user.click(within(dialog).getByRole('button', { name: /close|閉じる/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    expect(screen.getByTestId('markdown-preview').textContent ?? '').toContain('after update');
    expect(screen.queryByLabelText('Markdown入力')).toBeNull();
  });

  it('単改行(softbreak)が <br> として反映される', () => {
    render(<StatefulMarkdownBlock initialMarkdown={'Line1\nLine2'} />);

    const preview = screen.getByTestId('markdown-preview');
    expect(preview.textContent ?? '').toContain('Line1');
    expect(preview.textContent ?? '').toContain('Line2');
    expect(preview.querySelectorAll('br').length).toBeGreaterThan(0);
  });

  it('コードフェンスが pre > code としてレンダリングされる', () => {
    render(<StatefulMarkdownBlock initialMarkdown={'```js\nconst x = 1;\n```'} />);

    const preview = screen.getByTestId('markdown-preview');
    const pre = preview.querySelector('pre');
    const code = preview.querySelector('pre code');

    expect(pre).toBeTruthy();
    expect(code).toBeTruthy();
    expect(code?.textContent ?? '').toContain('const x = 1');
  });

  it('GFMのリスト/打ち消しが崩れない', () => {
    render(<StatefulMarkdownBlock initialMarkdown={'- a\n- b\n\n~~strike~~'} />);

    const preview = screen.getByTestId('markdown-preview');
    expect(preview.querySelectorAll('ul li').length).toBeGreaterThanOrEqual(2);

    const del = preview.querySelector('del');
    expect(del).toBeTruthy();
    expect(del?.textContent ?? '').toContain('strike');
  });

  it('Dialogを閉じた後、カード内DOMはプレビューのみ', async () => {
    const user = userEvent.setup();
    render(<StatefulMarkdownBlock initialMarkdown={'keep preview only'} />);

    await user.click(screen.getByRole('button', { name: 'Markdownを編集' }));
    await screen.findByRole('dialog', { name: /markdown editor/i });
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    expect(screen.queryByLabelText('Markdown入力')).toBeNull();
    expect(screen.getByTestId('markdown-preview')).toBeTruthy();
  });

  it('プレビュー要素がレンダリングされる', () => {
    render(<StatefulMarkdownBlock initialMarkdown={'a\nb\nc\nd\ne\nf\ng'} />);

    const preview = screen.getByTestId('markdown-preview');
    expect(preview).toBeTruthy();
  });

  it('空Markdownに閉じたcode fenceを貼るとcodeブロック1つで置換される', async () => {
    const user = userEvent.setup();
    const onReplaceWithBlocks = vi.fn();
    render(
      <MarkdownBlock
        markdown=""
        onChange={() => {}}
        onDelete={() => {}}
        onDuplicate={() => {}}
        onReplaceWithBlocks={onReplaceWithBlocks}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Markdownを編集' }));
    const dialog = await screen.findByRole('dialog', { name: /markdown editor/i });
    const textarea = within(dialog).getByLabelText('Markdown入力');

    fireEvent.paste(textarea, {
      clipboardData: {
        getData: (type: string) => (type === 'text/plain' ? '```ts\r\nconst a = 1;\r\n```' : ''),
      },
    });

    expect(onReplaceWithBlocks).toHaveBeenCalledTimes(1);
    expect(onReplaceWithBlocks.mock.calls[0][0]).toEqual([
      { type: 'code', code: { language: 'ts', code: 'const a = 1;' } },
    ]);
  });

  it('markdown+code混在を貼ると分割して置換される', async () => {
    const user = userEvent.setup();
    const onReplaceWithBlocks = vi.fn();
    render(
      <MarkdownBlock
        markdown=""
        onChange={() => {}}
        onDelete={() => {}}
        onDuplicate={() => {}}
        onReplaceWithBlocks={onReplaceWithBlocks}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Markdownを編集' }));
    const dialog = await screen.findByRole('dialog', { name: /markdown editor/i });
    const textarea = within(dialog).getByLabelText('Markdown入力');

    fireEvent.paste(textarea, {
      clipboardData: {
        getData: (type: string) =>
          type === 'text/plain' ? 'before\n```ts\nconst a = 1;\n```\nafter' : '',
      },
    });

    type CodeBlock = { type: 'code'; code: { language: string; code: string } };
type MarkdownBlockOut = { type: 'markdown'; markdown: string };
type OutputBlock = CodeBlock | MarkdownBlockOut;

const blocks = onReplaceWithBlocks.mock.calls[0][0] as OutputBlock[];
const normalized: OutputBlock[] = blocks.map((b) =>
  b.type === 'markdown'
    ? { ...b, markdown: b.markdown.replace(/\n+$/, '') }
    : b
);

expect(normalized).toEqual([
  { type: 'markdown', markdown: 'before' },
  { type: 'code', code: { language: 'ts', code: 'const a = 1;' } },
  { type: 'markdown', markdown: 'after' },
]);
  });
});
