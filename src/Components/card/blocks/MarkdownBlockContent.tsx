import React, { useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { cn } from '@/lib/utils';
import { CodeRenderer } from '../CodeRenderer';

interface MarkdownBlockContentProps {
  markdown: string;
  align?: 'left' | 'center';
  className?: string;
}

export const MarkdownBlockContent: React.FC<MarkdownBlockContentProps> = ({
  markdown,
  align,
  className,
}) => {
  const alignClass = align === 'center' ? 'text-center' : 'text-left';

  const extractText = (children: React.ReactNode): string =>
    React.Children.toArray(children)
      .map((child) => (typeof child === 'string' ? child : ''))
      .join('');

  const components = useMemo<Components>(
    () => ({
      h1: ({ children }) => (
        <h1 className="m-0 font-serif text-[24px] font-medium leading-[48px]">{children}</h1>
      ),
      h2: ({ children }) => (
        <h2 className="m-0 font-serif text-[20px] font-medium leading-[24px]">{children}</h2>
      ),
      h3: ({ children }) => (
        <h3 className="m-0 font-serif text-[18px] font-medium leading-[24px]">{children}</h3>
      ),
      h4: ({ children }) => (
        <h4 className="m-0 font-serif text-[16px] font-medium leading-[24px]">{children}</h4>
      ),
      p: ({ children }) => <p className="m-0 leading-[24px]">{children}</p>,
      del: ({ children }) => <del className="line-through">{children}</del>,
      hr: () => <hr className="m-0 border-slate-200" />,
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
      blockquote: ({ children }) => (
        <blockquote className="m-0 border-l-4 border-slate-300 pl-3 text-slate-600 italic">
          {children}
        </blockquote>
      ),
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
        <td className="border border-slate-200 px-2 py-1 text-slate-700 align-top">{children}</td>
      ),
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
      pre: ({ children }) => {
        const firstChild = React.Children.toArray(children)[0];
        if (!React.isValidElement(firstChild)) {
          const raw = extractText(children).replace(/\r\n/g, '\n').replace(/(?:\n)+$/, '');
          return (
            <div className="my-2">
              <CodeRenderer code={raw} language="clike" />
            </div>
          );
        }
        const childProps = firstChild.props as { className?: string; children?: React.ReactNode };
        const classStr = typeof childProps.className === 'string' ? childProps.className : '';
        const langMatch = /language-([^\s]+)/.exec(classStr);
        const language = langMatch?.[1] ?? 'clike';
        const rawCode = extractText(childProps.children).replace(/\r\n/g, '\n').replace(/(?:\n)+$/, '');
        return (
          <div className="m-0">
            <CodeRenderer code={rawCode} language={language} />
          </div>
        );
      },
    }),
    []
  );

  return (
    <div
      className={cn(
        'markdown-block-view markdownBlockPreview max-w-none font-serif text-[16px] font-medium leading-[24px] [font-variant-numeric:lining-nums_proportional-nums] [font-feature-settings:"lnum"_1]',
        alignClass,
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
};

