import { CodeRenderer } from "@/components/card/blocks/code/CodeRenderer";
import { BlockSurface } from "@/components/card/blocks/core/BlockSurface";
import {
  BLOCK_BODY_TEXT_COLOR_CLASS,
  TEXT_BLOCK_CONTENT_CLASS,
} from "@/components/card/blocks/text/textBlockStyles";
import { cn } from "@/lib/utils";
import React, { useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

const TYPE = {
  body: { fontSize: 16, lineHeight: 24 },
  h1: { fontSize: 40, lineHeight: 52 },
  h2: { fontSize: 32, lineHeight: 44 },
  h3: { fontSize: 26, lineHeight: 36 },
  h4: { fontSize: 20, lineHeight: 30 },
  code: { fontSize: 14, lineHeight: 22 },
} as const;

const ALLOW_MARKDOWN_IMAGES = false;

const ALLOWED_IMAGE_HOSTS = new Set<string>([
  // "cdn.yourapp.com",
]);

const ALLOWED_IMAGE_PATH_PREFIXES = ["/uploads/"] as const;

/**
 * 連続空行を表示用に保持するためのプレースホルダ。
 * 不可視文字はコピペ事故の元なので、ASCII だけにしている。
 */
const BLANK_LINE_PLACEHOLDER = "__MD_BLANK_LINE_PLACEHOLDER__";

const extractTextDeep = (node: React.ReactNode): string => {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractTextDeep).join("");
  if (React.isValidElement(node)) {
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    return extractTextDeep(element.props.children);
  }
  return "";
};

/**
 * Markdown の連続空行を潰さずに見た目へ反映する。
 * - 1個目の空行は通常の段落区切りとして残す
 * - 2個目以降はプレースホルダ段落を差し込む
 * - fenced code block 内は触らない
 */
const preserveExtraBlankLines = (input: string): string => {
  const normalized = input.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  const out: string[] = [];
  let blankRun = 0;
  let inFence = false;
  let fenceChar: "`" | "~" | "" = "";

  const flushBlankRun = () => {
    if (blankRun === 0) return;

    out.push("");

    for (let i = 1; i < blankRun; i += 1) {
      out.push(BLANK_LINE_PLACEHOLDER);
      out.push("");
    }

    blankRun = 0;
  };

  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);

    if (fenceMatch) {
      flushBlankRun();

      const currentFenceChar = fenceMatch[1][0] as "`" | "~";
      if (!inFence) {
        inFence = true;
        fenceChar = currentFenceChar;
      } else if (fenceChar === currentFenceChar) {
        inFence = false;
        fenceChar = "";
      }

      out.push(line);
      continue;
    }

    if (!inFence && line.trim() === "") {
      blankRun += 1;
      continue;
    }

    flushBlankRun();
    out.push(line);
  }

  flushBlankRun();
  return out.join("\n");
};

const hasControlChars = (s: string) => /\p{Cc}/u.test(s);
const hasWhitespace = (s: string) => /\s/.test(s);

const rebuildMailtoQuery = (rawQuery: string): string => {
  const safe = rawQuery.replace(/#/g, "%23");

  const pairs = safe.split("&");
  const out: string[] = [];

  for (const p of pairs) {
    if (!p) continue;

    const eq = p.indexOf("=");
    const kRaw = eq >= 0 ? p.slice(0, eq) : p;
    const vRaw = eq >= 0 ? p.slice(eq + 1) : "";

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

  return out.join("&");
};

const sanitizeLinkHref = (href: string | undefined): string | null => {
  if (!href) return null;

  const h0 = href.trim();
  if (!h0 || hasControlChars(h0)) return null;

  if (h0.startsWith("//")) return null;

  if (h0.startsWith("/") || h0.startsWith("#")) {
    return hasWhitespace(h0) ? null : h0;
  }

  const lower = h0.toLowerCase();

  if (lower.startsWith("tel:")) {
    const after = h0.slice(4);

    if (/[?#]/.test(after)) return null;

    const semi = after.indexOf(";");
    const numPart = semi >= 0 ? after.slice(0, semi) : after;
    const paramPartRaw = semi >= 0 ? after.slice(semi) : "";

    const normalizedNum = numPart.replace(/[\s().-]+/g, "");
    if (!normalizedNum) return null;

    if (!/^\+?[0-9*#]+$/.test(normalizedNum)) return null;

    const paramPart = paramPartRaw.replace(/\s+/g, "");
    if (paramPart && !/^([;][A-Za-z0-9=._-]+)*$/.test(paramPart)) return null;

    return `tel:${normalizedNum}${paramPart}`;
  }

  if (lower.startsWith("mailto:")) {
    const after = h0.slice(7);

    const qIndex = after.indexOf("?");
    const address = qIndex >= 0 ? after.slice(0, qIndex) : after;
    const rawQuery = qIndex >= 0 ? after.slice(qIndex + 1) : "";

    if (hasControlChars(address) || hasWhitespace(address)) return null;
    if (address && /[#?]/.test(address)) return null;

    if (rawQuery) {
      const rebuilt = rebuildMailtoQuery(rawQuery);
      return `mailto:${address}?${rebuilt}`;
    }

    return `mailto:${address}`;
  }

  if (hasWhitespace(h0)) return null;

  try {
    const u = new URL(h0);
    const ok = ["http:", "https:"].includes(u.protocol);
    return ok ? u.toString() : null;
  } catch {
    return null;
  }
};

const sanitizeImageSrc = (src: string): string | null => {
  if (!src) return null;

  const s = src.trim();
  if (!s || hasControlChars(s) || hasWhitespace(s)) return null;

  if (s.startsWith("//")) return null;

  if (s.startsWith("/")) {
    const ok = ALLOWED_IMAGE_PATH_PREFIXES.some((p) => s.startsWith(p));
    return ok ? s : null;
  }

  try {
    const u = new URL(s);

    if (u.protocol !== "https:") return null;
    if (!ALLOWED_IMAGE_HOSTS.has(u.hostname)) return null;

    return u.toString();
  } catch {
    return null;
  }
};

interface MarkdownBlockContentProps {
  markdown: string;
  align?: "left" | "center";
  className?: string;
  bleedX?: boolean;
}

export const MarkdownBlockContent: React.FC<MarkdownBlockContentProps> = ({
  markdown,
  align: _align,
  className,
  bleedX = false,
}) => {
  void _align;

  const bodyStyle = useMemo<React.CSSProperties>(
    () => ({
      fontSize: TYPE.body.fontSize,
      lineHeight: `var(--card-line-height, ${TYPE.body.lineHeight}px)`,
    }),
    [],
  );

  const renderedMarkdown = useMemo(
    () => preserveExtraBlankLines(markdown),
    [markdown],
  );

  const components = useMemo<Components>(
    () => ({
      h1: ({ children }) => (
        <BlockSurface
          ruled
          ruledRowPx={TYPE.h1.lineHeight}
          bleedX={bleedX}
          padTopRows={1}
          padBottomRows={1}
        >
          <h1
            className="m-0 font-serif font-medium text-left"
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
          padTopRows={1}
          padBottomRows={1}
        >
          <h2
            className="m-0 font-serif font-medium text-left"
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
          padTopRows={1}
          padBottomRows={1}
        >
          <h3
            className="m-0 font-serif font-medium text-left"
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
        <BlockSurface
          ruled
          ruledRowPx={TYPE.h4.lineHeight}
          bleedX={bleedX}
          padTopRows={1}
          padBottomRows={1}
        >
          <h4
            className="m-0 font-serif font-medium text-left"
            style={{
              fontSize: TYPE.h4.fontSize,
              lineHeight: `var(--card-line-height, ${TYPE.h4.lineHeight}px)`,
            }}
          >
            {children}
          </h4>
        </BlockSurface>
      ),

      p: ({ children }) => (
        <ParagraphRenderer children={children} bodyStyle={bodyStyle} />
      ),
      del: ({ children }) => <del className="line-through">{children}</del>,
      hr: () => <HrRenderer />,

      a: ({ href, children, ...props }) => {
        const safeHref = sanitizeLinkHref(
          typeof href === "string" ? href : undefined,
        );
        if (!safeHref) return <span className="break-words">{children}</span>;

        const isInternal = safeHref.startsWith("/") || safeHref.startsWith("#");
        const isHttp =
          safeHref.startsWith("http://") || safeHref.startsWith("https://");

        return (
          <a
            {...props}
            href={safeHref}
            target={!isInternal && isHttp ? "_blank" : undefined}
            rel={
              !isInternal && isHttp
                ? "noopener noreferrer nofollow ugc"
                : undefined
            }
            className="break-words underline text-primary-600 hover:text-primary-800"
          >
            {children}
          </a>
        );
      },

      img: ({ src = "", alt = "", title }) => {
        if (!ALLOW_MARKDOWN_IMAGES) {
          return (
            <span className="text-slate-500">
              [画像は画像ブロックで追加してください{alt ? `: ${alt}` : ""}]
            </span>
          );
        }

        const safe = sanitizeImageSrc(src);
        if (!safe) {
          return (
            <span className="text-slate-500">
              [許可されていない画像URLです]
            </span>
          );
        }

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
          className="blockquoteNoRuled"
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
            className="markdownBlockquote m-0 border-l-4 border-slate-300 text-left italic"
            style={{ ...bodyStyle, paddingLeft: "var(--card-row-px)" }}
          >
            {children}
          </blockquote>
        </BlockSurface>
      ),

      ul: ({ children }) => (
        <ListRenderer ordered={false}>{children}</ListRenderer>
      ),
      ol: ({ children }) => <ListRenderer ordered>{children}</ListRenderer>,
      li: ({ children }) => (
        <li className="m-0 text-left" style={bodyStyle}>
          {children}
        </li>
      ),

      table: ({ children }) => <TableRenderer>{children}</TableRenderer>,
      thead: ({ children }) => (
        <thead className="bg-slate-50">{children}</thead>
      ),
      tbody: ({ children }) => <tbody>{children}</tbody>,
      tr: ({ children }) => (
        <tr className="border-b border-slate-200">{children}</tr>
      ),
      th: ({ children }) => (
        <th className="whitespace-nowrap border border-slate-200 px-2 py-1 text-left font-semibold">
          {children}
        </th>
      ),
      td: ({ children }) => (
        <td className="align-top border border-slate-200 px-2 py-1 text-left">
          {children}
        </td>
      ),

      code: ({ className: codeClassName, children }) => {
        const classStr = typeof codeClassName === "string" ? codeClassName : "";
        const isBlockCode = classStr.includes("language-");

        if (isBlockCode) {
          return <code className={codeClassName}>{children}</code>;
        }

        return (
          <code
            className="inline rounded bg-red-50 px-1 py-0 align-baseline font-mono text-red-600 ring-1 ring-inset ring-red-100"
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
        const firstEl = nodes.find((n): n is React.ReactElement =>
          React.isValidElement(n),
        );

        if (!firstEl) {
          const raw = extractTextDeep(children)
            .replace(/\r\n/g, "\n")
            .replace(/(?:\n)+$/, "");
          return (
            <MarkdownFencedCodeBlock
              code={raw}
              language="clike"
              bleedX={bleedX}
            />
          );
        }

        const childProps = firstEl.props as {
          className?: string;
          children?: React.ReactNode;
        };
        const classStr =
          typeof childProps.className === "string" ? childProps.className : "";
        const langMatch = /language-([^\s]+)/.exec(classStr);
        const language = langMatch?.[1] ?? "clike";
        const rawCode = extractTextDeep(childProps.children)
          .replace(/\r\n/g, "\n")
          .replace(/(?:\n)+$/, "");

        return (
          <MarkdownFencedCodeBlock
            code={rawCode}
            language={language}
            bleedX={bleedX}
          />
        );
      },
    }),
    [bleedX, bodyStyle],
  );

  return (
    <div
      className={cn(
        `markdown-block-view markdownBlockPreview markdownBlockCardView max-w-none font-serif text-[16px] font-medium leading-[24px] ${BLOCK_BODY_TEXT_COLOR_CLASS} [font-variant-numeric:lining-nums_tabular-nums] [font-feature-settings:"lnum"_1]`,
        "text-left",
        "[&_*]:text-left",
        "[&>*+*]:mt-[var(--card-row-px)]",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={components}
      >
        {renderedMarkdown}
      </ReactMarkdown>
    </div>
  );
};

const ParagraphRenderer = (
  {
    children,
    bodyStyle,
  }: {
    children: React.ReactNode;
    bodyStyle: React.CSSProperties;
  }
) => {
  const text = extractTextDeep(children);
  const isBlankSpacer = text === BLANK_LINE_PLACEHOLDER;

  return (
    <p
      aria-hidden={isBlankSpacer ? true : undefined}
      className={cn(
        TEXT_BLOCK_CONTENT_CLASS,
        "m-0 border-none bg-transparent p-0 text-left",
        isBlankSpacer && "select-none text-transparent",
      )}
      style={bodyStyle}
    >
      {isBlankSpacer ? " " : children}
    </p>
  );
};

const MarkdownFencedCodeBlock = (
  {
    code,
    language,
    bleedX,
  }: {
    code: string;
    language: string;
    bleedX: boolean;
  }
) => {
  return (
    <BlockSurface
      ruled={false}
      bleedX={bleedX}
      background="var(--card-surface)"
      className="m-0"
    >
      <CodeRenderer code={code} language={language} />
    </BlockSurface>
  );
};

const HrRenderer = () => {
  return <hr className="m-0 border-slate-200" />;
};

const ListRenderer = (
  {
    ordered,
    children,
  }: {
    ordered: boolean;
    children: React.ReactNode;
  }
) => {
  const Tag = ordered ? "ol" : "ul";
  const listClass = cn(
    ordered ? "list-decimal list-outside" : "list-disc list-outside",
    "m-0 pl-6 text-left space-y-0",
    ordered ? "[&>li>ol]:pl-5 [&>li>ul]:pl-5" : "[&>li>ul]:pl-5 [&>li>ol]:pl-5",
    ordered ? "[&>li>ol]:mt-0 [&>li>ul]:mt-0" : "[&>li>ul]:mt-0 [&>li>ol]:mt-0",
  );

  return <Tag className={listClass}>{children}</Tag>;
};

const TableRenderer = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="m-0 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  );
};
