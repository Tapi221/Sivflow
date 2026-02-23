import React, { useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { cn } from '@/lib/utils';
import { CodeRenderer } from '../CodeRenderer';

interface MarkdownBlockViewProps {
  md: string;
  align?: 'left' | 'center';
  className?: string;
}

/**
 * Markdown表示コンポーネント（読み取り専用レンダラ）
 * - react-markdown + remark-gfm
 * - rehype-raw は使わない（XSS対策）
 * - リストのネストが見える
 * - テーブルを表として表示
 * - prism-react-renderer(v2)でコードブロックをハイライト
 */
export const MarkdownBlockView: React.FC<MarkdownBlockViewProps> = ({
  md,
  align,
  className,
}) => {
  const alignClass = align === 'center' ? 'text-center' : 'text-left';

  const extractText = (children: React.ReactNode): string =>
    React.Children.toArray(children)
      .map((child) => (typeof child === 'string' ? child : ''))
      .join('');

  const components = useMemo<Components>(() => ({
    // 見出しも24pxグリッドに沿う（余白はCSS側で一括管理）
    h1: ({ children }) => <h1 className="m-0 font-serif text-[24px] font-medium leading-[48px]">{children}</h1>,
    h2: ({ children }) => <h2 className="m-0 font-serif text-[20px] font-medium leading-[24px]">{children}</h2>,
    h3: ({ children }) => <h3 className="m-0 font-serif text-[18px] font-medium leading-[24px]">{children}</h3>,
    h4: ({ children }) => <h4 className="m-0 font-serif text-[16px] font-medium leading-[24px]">{children}</h4>,
    p: ({ children }) => <p className="m-0 leading-[24px]">{children}</p>,

    // 取り消し線（CSSで無効化されがちなので明示）
    del: ({ children }) => <del className="line-through">{children}</del>,

    // 区切り線
    hr: () => <hr className="m-0 border-slate-200" />,

    // リンク
    a: ({ children, ...props }) => (
      <a
        {...props}
        target="_blank"
        rel="noreferrer"
        className="underline text-primary-600 hover:text-primary-800 break-words"
      >
        {children}
      </a>
    ),

    // 引用
    blockquote: ({ children }) => (
      <blockquote className="m-0 border-l-4 border-slate-300 pl-3 text-slate-600 italic">
        {children}
      </blockquote>
    ),

    // リスト（ネスト可視化）
    ul: ({ children }) => (
      <ul
        className={cn(
          'list-disc list-outside',
          'm-0 pl-6 space-y-0',
          '[&>li>ul]:pl-5 [&>li>ol]:pl-5',
          '[&>li>ul]:mt-0 [&>li>ol]:mt-0'
        )}
      >
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol
        className={cn(
          'list-decimal list-outside',
          'm-0 pl-6 space-y-0',
          '[&>li>ol]:pl-5 [&>li>ul]:pl-5',
          '[&>li>ol]:mt-0 [&>li>ul]:mt-0'
        )}
      >
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="m-0 leading-[24px]">{children}</li>,

    // テーブル（見た目を「表」にする）
    table: ({ children }) => (
      <div className="m-0 overflow-x-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => <tr className="border-b border-slate-200">{children}</tr>,
    th: ({ children }) => (
      <th className="border border-slate-200 px-2 py-1 text-left font-semibold text-slate-700 whitespace-nowrap">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-slate-200 px-2 py-1 text-slate-700 align-top">
        {children}
      </td>
    ),

    // インラインコードのみ（fenced code block は pre 側で処理）
    code: ({ className: codeClassName, children, ...props }) => {
      const classStr = typeof codeClassName === 'string' ? codeClassName : '';
      const isBlockCode = classStr.includes('language-');

      if (isBlockCode) return <code className={codeClassName} {...props}>{children}</code>;

      return (
        <code
          className="rounded px-1 py-0 font-mono text-[0.9em] leading-none align-baseline bg-red-50 text-red-600 ring-1 ring-inset ring-red-100"
          {...props}
        >
          {children}
        </code>
      );
    },

    // fenced code block は通常コードブロックと同じ CodeRenderer で描画
    pre: ({ children }) => {
      const firstChild = React.Children.toArray(children)[0];
        if (!React.isValidElement(firstChild)) {
          return (
            <div className="code-block codeBlock my-2">
              <pre className="m-0 overflow-x-auto">{children}</pre>
            </div>
          );
        }

      const childProps = firstChild.props as { className?: string; children?: React.ReactNode };
      const classStr = typeof childProps.className === 'string' ? childProps.className : '';
      const langMatch = /language-([^\s]+)/.exec(classStr);
      const language = langMatch?.[1] ?? 'clike';
      const rawCode = extractText(childProps.children)
        .replace(/\r\n/g, '\n')
        .replace(/(?:\n)+$/, '');

      return (
        <div className="m-0 code-block codeBlock">
          <CodeRenderer code={rawCode} language={language} />
        </div>
      );
    },
  }), []);

  return (
    <div className={cn('markdown-block-view markdownBlockPreview max-w-none font-serif text-[16px] font-medium leading-[24px] [font-variant-numeric:lining-nums_proportional-nums] [font-feature-settings:\"lnum\"_1]', alignClass, className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {md}
      </ReactMarkdown>
    </div>
  );
};