import React, { useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { cn } from '@/lib/utils';
import { CodeRenderer } from '../CodeRenderer';
import { BlockSurface } from '@/components/card/BlockSurface';

const TYPE = {
  body: { fontSize: 16, lineHeight: 24 },
  h1: { fontSize: 40, lineHeight: 52 },
  h2: { fontSize: 32, lineHeight: 44 },
  h3: { fontSize: 26, lineHeight: 36 },
  h4: { fontSize: 20, lineHeight: 30 },
  code: { fontSize: 14, lineHeight: 22 },
} as const;

/**
 * ✅ 今は Markdown 内の画像を「表示しない」運用にしておいて、
 * 将来 true にすれば “許可された画像だけ” 表示できます。
 */
const ALLOW_MARKDOWN_IMAGES = false;

/**
 * ✅ 許可する画像ホスト（自社CDNなど）だけ入れる
 * - 例: 'cdn.yourapp.com'
 */
const ALLOWED_IMAGE_HOSTS = new Set<string>([
  // 'cdn.yourapp.com',
]);

/**
 * ✅ 相対パスで許可する画像プレフィックス（運用に合わせて追加/変更）
 * - 将来 ALLOW_MARKDOWN_IMAGES=true にした時、/api/... 等へ飛ばないように絞る
 */
const ALLOWED_IMAGE_PATH_PREFIXES = ['/uploads/'] as const;

const extractTextDeep = (node: React.ReactNode): string => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTextDeep).join('');
  if (React.isValidElement(node)) {
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    return extractTextDeep(element.props.children);
  }
  return '';
};

// ✅ 制御文字は一律拒否（安全）
// ✅ 空白は「リンク種別ごと」に扱いを変える（tel/mailto は救済）
const hasControlChars = (s: string) => /\p{Cc}/u.test(s);
const hasWhitespace = (s: string) => /\s/.test(s);

// mailto の ? 以降を “なるべく壊れにくく” 再構築
// - 空白は %20
// - # は %23（ブラウザのフラグメント扱い回避）
// - 値に未エンコードの & / = が混ざるケースは原理的に救えない（入力自体が壊れている）
const rebuildMailtoQuery = (rawQuery: string): string => {
  const safe = rawQuery.replace(/#/g, '%23');

  const pairs = safe.split('&');
  const out: string[] = [];

  for (const p of pairs) {
    if (!p) continue;

    const eq = p.indexOf('=');
    const kRaw = eq >= 0 ? p.slice(0, eq) : p;
    const vRaw = eq >= 0 ? p.slice(eq + 1) : '';

    const safeDecode = (x: string) => {
      try {
        return decodeURIComponent(x);
      } catch {
        return x;
      }
    };

    const k = safeDecode(kRaw);
    const v = safeDecode(vRaw);

    const enc = (x: string) => encodeURIComponent(x);

    if (eq >= 0) out.push(`${enc(k)}=${enc(v)}`);
    else out.push(enc(k));
  }

  return out.join('&');
};

const sanitizeLinkHref = (href: string | undefined): string | null => {
  if (!href) return null;

  const h0 = href.trim();
  if (!h0 || hasControlChars(h0)) return null;

  // protocol-relative は拒否（//example.com）
  if (h0.startsWith('//')) return null;

  // 相対URL / アンカーは許可（空白は拒否）
  if (h0.startsWith('/') || h0.startsWith('#')) {
    return hasWhitespace(h0) ? null : h0;
  }

  const lower = h0.toLowerCase();

  // tel: は実用入力を救済（空白・()・.・- を除去）
  if (lower.startsWith('tel:')) {
    const after = h0.slice(4);

    // tel: に ? や # は通常想定しない（挙動ブレの温床）ので拒否
    if (/[?#]/.test(after)) return null;

    // パラメータ（;ext=... など）が付く可能性に備え、最初の ; で分割
    const semi = after.indexOf(';');
    const numPart = semi >= 0 ? after.slice(0, semi) : after;
    const paramPartRaw = semi >= 0 ? after.slice(semi) : '';

    const normalizedNum = numPart.replace(/[\s().-]+/g, '');
    if (!normalizedNum) return null;

    // ざっくり許可（+ / 数字 / * #）
    if (!/^\+?[0-9*#]+$/.test(normalizedNum)) return null;

    // ✅ paramPart は許可するなら軽く制限（運用方針に合わせて調整OK）
    // 例: ;ext=123 / ;phone-context=... などを想定し、記号は ; = . _ - のみに絞る
    const paramPart = paramPartRaw.replace(/\s+/g, '');
    if (paramPart && !/^([;][A-Za-z0-9=._-]+)*$/.test(paramPart)) return null;

    return `tel:${normalizedNum}${paramPart}`;
  }

  // mailto: は ? 以降を再構築して壊れにくくする
  if (lower.startsWith('mailto:')) {
    const after = h0.slice(7);

    const qIndex = after.indexOf('?');
    const address = qIndex >= 0 ? after.slice(0, qIndex) : after;
    const rawQuery = qIndex >= 0 ? after.slice(qIndex + 1) : '';

    // `mailto:?subject=...` は仕様上あり得るので address 空は許可（ただし空白/制御は拒否）
    if (hasControlChars(address) || hasWhitespace(address)) return null;

    // ✅ address 部分に # / ? が混ざるのはブラウザ解釈がブレやすいので拒否（空ならOK）
    if (address && /[#?]/.test(address)) return null;

    if (rawQuery) {
      const rebuilt = rebuildMailtoQuery(rawQuery);
      return `mailto:${address}?${rebuilt}`;
    }

    return `mailto:${address}`;
  }

  // http/https は空白があれば拒否（安全寄り）
  if (hasWhitespace(h0)) return null;

  try {
    const u = new URL(h0);
    const ok = ['http:', 'https:'].includes(u.protocol);
    return ok ? u.toString() : null;
  } catch {
    return null;
  }
};

const sanitizeImageSrc = (src: string): string | null => {
  if (!src) return null;

  const s = src.trim();
  if (!s || hasControlChars(s) || hasWhitespace(s)) return null;

  // protocol-relative は拒否（//example.com/a.png）
  if (s.startsWith('//')) return null;

  // ✅ 相対URLは prefix を絞って許可（/uploads/ のみ等）
  if (s.startsWith('/')) {
    const ok = ALLOWED_IMAGE_PATH_PREFIXES.some((p) => s.startsWith(p));
    return ok ? s : null;
  }

  try {
    const u = new URL(s);

    // https のみに寄せる
    if (u.protocol !== 'https:') return null;

    // 許可ホストのみ
    if (!ALLOWED_IMAGE_HOSTS.has(u.hostname)) return null;

    return u.toString();
  } catch {
    return null;
  }
};

interface MarkdownBlockContentProps {
  markdown: string;
  align?: 'left' | 'center';
  className?: string;
  bleedX?: boolean;
}

export const MarkdownBlockContent: React.FC<MarkdownBlockContentProps> = ({
  markdown,
  align,
  className,
  bleedX = false,
}) => {
  const alignClass = align === 'center' ? 'text-center' : 'text-left';

  const bodyStyle = useMemo<React.CSSProperties>(
    () => ({
      fontSize: TYPE.body.fontSize,
      lineHeight: `var(--card-line-height, ${TYPE.body.lineHeight}px)`,
    }),
    []
  );

  const components = useMemo<Components>(
    () => ({
      h1: ({ children }) => (
        <BlockSurface
          ruled
          ruledRowPx={TYPE.h1.lineHeight}
          bleedX={bleedX}
          padBottomRows={1}
        >
          <h1
            className="m-0 font-serif font-medium"
            style={{
              fontSize: TYPE.h1.fontSize,
              lineHeight: `var(--card-line-height, ${TYPE.h1.lineHeight}px)`,
            }}
          >
            {children}
          </h1>
        </BlockSurface>
      ),
      h2: ({ children }) => (
        <BlockSurface
          ruled
          ruledRowPx={TYPE.h2.lineHeight}
          bleedX={bleedX}
          padBottomRows={1}
        >
          <h2
            className="m-0 font-serif font-medium"
            style={{
              fontSize: TYPE.h2.fontSize,
              lineHeight: `var(--card-line-height, ${TYPE.h2.lineHeight}px)`,
            }}
          >
            {children}
          </h2>
        </BlockSurface>
      ),
      h3: ({ children }) => (
        <BlockSurface
          ruled
          ruledRowPx={TYPE.h3.lineHeight}
          bleedX={bleedX}
          padBottomRows={1}
        >
          <h3
            className="m-0 font-serif font-medium"
            style={{
              fontSize: TYPE.h3.fontSize,
              lineHeight: `var(--card-line-height, ${TYPE.h3.lineHeight}px)`,
            }}
          >
            {children}
          </h3>
        </BlockSurface>
      ),
      h4: ({ children }) => (
        <BlockSurface ruled ruledRowPx={TYPE.h4.lineHeight} bleedX={bleedX}>
          <h4
            className="m-0 font-serif font-medium"
            style={{
              fontSize: TYPE.h4.fontSize,
              lineHeight: `var(--card-line-height, ${TYPE.h4.lineHeight}px)`,
            }}
          >
            {children}
          </h4>
        </BlockSurface>
      ),

      p: ({ children }) => <ParagraphRenderer children={children} bodyStyle={bodyStyle} />,
      del: ({ children }) => <del className="line-through">{children}</del>,
      hr: () => <HrRenderer />,

      // ✅ node を受け取らない（unused-vars 回避）
      a: ({ href, children, ...props }) => {
        const safeHref = sanitizeLinkHref(typeof href === 'string' ? href : undefined);
        if (!safeHref) return <span className="break-words">{children}</span>;

        const isInternal = safeHref.startsWith('/') || safeHref.startsWith('#');
        const isHttp = safeHref.startsWith('http://') || safeHref.startsWith('https://');

        return (
          <a
            {...props}
            href={safeHref}
            target={!isInternal && isHttp ? '_blank' : undefined}
            rel={!isInternal && isHttp ? 'noopener noreferrer nofollow ugc' : undefined}
            className="underline text-primary-600 hover:text-primary-800 break-words"
          >
            {children}
          </a>
        );
      },

      // ✅ node を受け取らない（unused-vars 回避）
      img: ({ src = '', alt = '', title }) => {
        if (!ALLOW_MARKDOWN_IMAGES) {
          return (
            <span className="text-slate-500">
              [画像は画像ブロックで追加してください{alt ? `: ${alt}` : ''}]
            </span>
          );
        }

        const safe = sanitizeImageSrc(src);
        if (!safe) return <span className="text-slate-500">[許可されていない画像URLです]</span>;

        return (
          <img
            src={safe}
            alt={alt}
            title={title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="max-w-full rounded-lg"
          />
        );
      },

      blockquote: ({ children }) => (
        <BlockSurface
          ruled={false}
          bleedX={false}
          background="var(--card-surface)"
          contentClassName="blockquoteNoRuled"
          padTopRows={1}
          padBottomRows={1}
          padLeftRows={0}
          padRightRows={0}
        >
          <blockquote
            className="m-0 border-l-4 border-slate-300 italic"
            style={{ ...bodyStyle, paddingLeft: 'var(--card-row-px)' }}
          >
            {children}
          </blockquote>
        </BlockSurface>
      ),

      ul: ({ children }) => <ListRenderer ordered={false}>{children}</ListRenderer>,
      ol: ({ children }) => <ListRenderer ordered>{children}</ListRenderer>,
      li: ({ children }) => (
        <li className="m-0" style={bodyStyle}>
          {children}
        </li>
      ),

      table: ({ children }) => <TableRenderer>{children}</TableRenderer>,
      thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
      tbody: ({ children }) => <tbody>{children}</tbody>,
      tr: ({ children }) => <tr className="border-b border-slate-200">{children}</tr>,
      th: ({ children }) => (
        <th className="border border-slate-200 px-2 py-1 text-left font-semibold whitespace-nowrap">
          {children}
        </th>
      ),
      td: ({ children }) => <td className="border border-slate-200 px-2 py-1 align-top">{children}</td>,

      // ✅ node を受け取らない（unused-vars 回避）
      code: ({ className: codeClassName, children }) => {
        const classStr = typeof codeClassName === 'string' ? codeClassName : '';
        const isBlockCode = classStr.includes('language-');

        if (isBlockCode) return <code className={codeClassName}>{children}</code>;

        return (
          <code
            className="rounded px-1 py-0 font-mono align-baseline bg-red-50 text-red-600 ring-1 ring-inset ring-red-100"
            style={{
              fontSize: `${TYPE.code.fontSize}px`,
              lineHeight: `var(--card-line-height, ${TYPE.body.lineHeight}px)`,
            }}
          >
            {children}
          </code>
        );
      },

      pre: ({ children }) => {
        const nodes = React.Children.toArray(children);
        const firstEl = nodes.find((n): n is React.ReactElement => React.isValidElement(n));

        if (!firstEl) {
          const raw = extractTextDeep(children).replace(/\r\n/g, '\n').replace(/(?:\n)+$/, '');
          return <MarkdownFencedCodeBlock code={raw} language="clike" bleedX={bleedX} />;
        }

        const childProps = firstEl.props as { className?: string; children?: React.ReactNode };
        const classStr = typeof childProps.className === 'string' ? childProps.className : '';
        const langMatch = /language-([^\s]+)/.exec(classStr);
        const language = langMatch?.[1] ?? 'clike';
        const rawCode = extractTextDeep(childProps.children)
          .replace(/\r\n/g, '\n')
          .replace(/(?:\n)+$/, '');

        return <MarkdownFencedCodeBlock code={rawCode} language={language} bleedX={bleedX} />;
      },
    }),
    [bleedX, bodyStyle]
  );

  return (
    <div
      className={cn(
        'markdown-block-view markdownBlockPreview max-w-none font-serif text-[16px] font-medium leading-[24px] text-[#222222] [font-variant-numeric:lining-nums_tabular-nums] [font-feature-settings:"lnum"_1]',
        '[&_p+p]:mt-[24px]',
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

function ParagraphRenderer({
  children,
  bodyStyle,
}: {
  children: React.ReactNode;
  bodyStyle: React.CSSProperties;
}) {
  return (
    <p className="m-0" style={{ ...bodyStyle, whiteSpace: 'pre-wrap' }}>
      {children}
    </p>
  );
}

function MarkdownFencedCodeBlock({
  code,
  language,
  bleedX,
}: {
  code: string;
  language: string;
  bleedX: boolean;
}) {
  return (
    <BlockSurface ruled={false} bleedX={bleedX} background="var(--card-surface)" className="m-0">
      <CodeRenderer code={code} language={language} />
    </BlockSurface>
  );
}

function HrRenderer() {
  return <hr className="m-0 border-slate-200" />;
}

function ListRenderer({ ordered, children }: { ordered: boolean; children: React.ReactNode }) {
  const Tag = ordered ? 'ol' : 'ul';
  const listClass = cn(
    ordered ? 'list-decimal list-outside' : 'list-disc list-outside',
    'm-0 pl-6 space-y-0',
    ordered ? '[&>li>ol]:pl-5 [&>li>ul]:pl-5' : '[&>li>ul]:pl-5 [&>li>ol]:pl-5',
    ordered ? '[&>li>ol]:mt-0 [&>li>ul]:mt-0' : '[&>li>ul]:mt-0 [&>li>ol]:mt-0'
  );

  return <Tag className={listClass}>{children}</Tag>;
}

function TableRenderer({ children }: { children: React.ReactNode }) {
  return (
    <div className="m-0 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}