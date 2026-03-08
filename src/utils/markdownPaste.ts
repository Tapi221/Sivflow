import DOMPurify from "dompurify";
import TurndownService from "turndown";

/**
 * HTML を安全にサニタイズし、Markdown に変換するユーティリティ。
 * AI チャット(ChatGPT/Claude/Perplexity)やNotion/Google Docs からの
 * コピペを安全に処理する。
 */

// Turndown インスタンス（再利用）
const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

// コードブロックのルール追加
turndown.addRule("fencedCode", {
  filter: (node) => {
    return node.nodeName === "PRE" && node.querySelector("code") !== null;
  },
  replacement: (_content, node) => {
    const codeEl = (node as HTMLElement).querySelector("code");
    if (!codeEl) return _content;

    // 言語クラスから言語名を推測（例: language-javascript → javascript）
    const langClass = codeEl.className
      .split(/\s+/)
      .find((c) => c.startsWith("language-") || c.startsWith("lang-"));
    const lang = langClass ? langClass.replace(/^(language-|lang-)/, "") : "";

    const code = codeEl.textContent || "";
    return `\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
  },
});

/**
 * HTML文字列をサニタイズした後、Markdownに変換する。
 *
 * @param html - クリップボードから取得したHTML文字列
 * @returns 安全なMarkdown文字列
 */
export function sanitizeAndConvertToMarkdown(html: string): string {
  // 1. DOMPurify でサニタイズ（script/style/event handler等を除去）
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "a",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "pre",
      "code",
      "blockquote",
      "hr",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "del",
      "sup",
      "sub",
      "span",
      "div",
    ],
    ALLOWED_ATTR: ["href", "class", "className", "lang"],
    KEEP_CONTENT: true,
  });

  // 2. Turndown で Markdown に変換
  let md = turndown.turndown(clean);

  // 3. 連続空行を2行までに正規化
  md = md.replace(/\n{3,}/g, "\n\n");

  return md.trim();
}




