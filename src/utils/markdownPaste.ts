import DOMPurify from "dompurify";
import TurndownService from "turndown";



const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});



turndown.addRule("fencedCode", {
  filter: (node) => {
    return node.nodeName === "PRE" && node.querySelector("code") !== null;
  },
  replacement: (content, node) => {
    const codeEl = (node as HTMLElement).querySelector("code");
    if (!codeEl) return content;

    const langClass = codeEl.className
      .split(/\s+/)
      .find((className) => className.startsWith("language-") || className.startsWith("lang-"));
    const lang = langClass ? langClass.replace(/^(language-|lang-)/, "") : "";
    const code = codeEl.textContent ?? "";

    return `\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
  },
});
const sanitizeAndConvertToMarkdown = (html: string) => {
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "pre", "code", "blockquote", "hr", "table", "thead", "tbody", "tr", "th", "td", "del", "sup", "sub", "span", "div"], ALLOWED_ATTR: ["href", "class", "className", "lang"], KEEP_CONTENT: true });
  const markdown = turndown.turndown(clean).replace(/\n{3,}/g, "\n\n");

  return markdown.trim();
};



export { sanitizeAndConvertToMarkdown };
