import type { TCodeBlockElement } from "platejs";
import type { SlateElementProps, SlateLeafProps } from "platejs/static";
import { SlateElement, SlateLeaf } from "platejs/static";
import { cn } from "@/lib/utils";

type CodeBlockNodeStaticProps = SlateElementProps<TCodeBlockElement>;

const CODE_BLOCK_CLASS_NAME = "my-4 overflow-x-auto rounded-md border bg-muted px-4 py-3 font-mono text-sm";
const CODE_DOCX_FONT_FAMILY = "var(--docx-code-font-family)";
const syntaxColors: Record<string, string> = {
  "hljs-addition": "#22863a",
  "hljs-attr": "#005cc5",
  "hljs-attribute": "#005cc5",
  "hljs-built_in": "#e36209",
  "hljs-bullet": "#735c0f",
  "hljs-comment": "#6a737d",
  "hljs-deletion": "#b31d28",
  "hljs-doctag": "#d73a49",
  "hljs-emphasis": "#24292e",
  "hljs-formula": "#6a737d",
  "hljs-keyword": "#d73a49",
  "hljs-literal": "#005cc5",
  "hljs-meta": "#005cc5",
  "hljs-name": "#22863a",
  "hljs-number": "#005cc5",
  "hljs-operator": "#005cc5",
  "hljs-quote": "#22863a",
  "hljs-regexp": "#032f62",
  "hljs-section": "#005cc5",
  "hljs-selector-attr": "#005cc5",
  "hljs-selector-class": "#005cc5",
  "hljs-selector-id": "#005cc5",
  "hljs-selector-pseudo": "#22863a",
  "hljs-selector-tag": "#22863a",
  "hljs-string": "#032f62",
  "hljs-strong": "#24292e",
  "hljs-symbol": "#e36209",
  "hljs-template-tag": "#d73a49",
  "hljs-template-variable": "#d73a49",
  "hljs-title": "#6f42c1",
  "hljs-type": "#d73a49",
  "hljs-variable": "#005cc5",
};

const preserveSpaces = (text: string) => text.replace(/ /g, "\u00A0");
const getCodeSyntaxDocxStyle = (tokenClassName: string | undefined) => {
  const style: {
    color?: string;
    fontFamily: string;
    fontSize: string;
    fontStyle?: string;
    fontWeight?: string;
  } = {
    fontFamily: CODE_DOCX_FONT_FAMILY,
    fontSize: "10pt",
  };
  if (!tokenClassName) {
    return style;
  }
  tokenClassName.split(" ").forEach((className) => {
    if (syntaxColors[className]) {
      style.color = syntaxColors[className];
    }
    if (className === "hljs-strong" || className === "hljs-section") {
      style.fontWeight = "bold";
    }
    if (className === "hljs-emphasis") {
      style.fontStyle = "italic";
    }
  });
  return style;
};

const CodeBlockNodeStatic = ({ className, children, ...props }: CodeBlockNodeStaticProps) => (
  <SlateElement
    as="pre"
    className={cn(CODE_BLOCK_CLASS_NAME, className)}
    {...props}
  >
    <code>{children}</code>
  </SlateElement>
);
const CodeLineNodeStatic = ({ className, children, ...props }: SlateElementProps) => (
  <SlateElement as="div" className={cn("min-h-5", className)} {...props}>
    {children}
  </SlateElement>
);
const CodeSyntaxLeafStatic = (props: SlateLeafProps) => {
  const tokenClassName = props.leaf.className as string | undefined;
  return <SlateLeaf className={tokenClassName} {...props} />;
};
const CodeBlockElementDocx = ({ children, ...props }: SlateElementProps<TCodeBlockElement>) => (
  <SlateElement {...props}>
    <div
      style={{
        backgroundColor: "#f5f5f5",
        border: "1px solid #e0e0e0",
        margin: "8pt 0",
        padding: "12pt",
      }}
    >
      {children}
    </div>
  </SlateElement>
);
const CodeLineElementDocx = (props: SlateElementProps) => (
  <SlateElement
    {...props}
    as="p"
    style={{
      fontFamily: CODE_DOCX_FONT_FAMILY,
      fontSize: "10pt",
      margin: 0,
      padding: 0,
    }}
  />
);
const CodeSyntaxLeafDocx = (props: SlateLeafProps) => {
  const tokenClassName = props.leaf.className as string | undefined;
  const text = (props.leaf.text as string | undefined) ?? "";
  return (
    <span data-slate-leaf="true" style={getCodeSyntaxDocxStyle(tokenClassName)}>
      {preserveSpaces(text)}
    </span>
  );
};

const CodeBlockElementStatic = CodeBlockNodeStatic;
const CodeLineElementStatic = CodeLineNodeStatic;
const CodeSyntaxLeaf = CodeSyntaxLeafStatic;

export { CodeBlockElementDocx, CodeBlockElementStatic, CodeBlockNodeStatic, CodeLineElementDocx, CodeLineElementStatic, CodeLineNodeStatic, CodeSyntaxLeaf, CodeSyntaxLeafDocx, CodeSyntaxLeafStatic };
export type { CodeBlockNodeStaticProps };