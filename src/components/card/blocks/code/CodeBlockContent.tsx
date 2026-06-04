import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ClipboardEvent as ReactClipboardEvent, FormEvent as ReactFormEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import type { RenderProps } from "prism-react-renderer";
import { Highlight } from "prism-react-renderer";
import Prism from "prismjs";
import { BlockInset } from "@/components/card/blocks/editor/BlockInset";
import { buildTypographyStyle, mergeStyles, scaleTypographyNumberPx } from "@/components/card/common/cardSetViewZoom";
import { Check, Copy } from "@/ui/icons";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-c";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-css";
import "prismjs/components/prism-go";
import "prismjs/components/prism-java";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-python";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-typescript";
import { CodeBlockFrame } from "./CodeBlockFrame";
import { getViewerLanguageLabels, normalizeEditorLanguage, normalizeViewerLanguage } from "./codeBlockLanguage";
import { cn } from "@/lib/utils";
import { webClipboardAdapter } from "@/platform/clipboard/webClipboardAdapter";
import { codeTheme } from "@shared/design-tokens/codeTheme";

type CodeBlockContentProps =
  | {
    mode: "viewer";
    code: string;
    language?: string;
    className?: string;
    zoom?: number;
  }
  | {
    mode: "editor";
    code: string;
    language?: string;
    className?: string;
    headerLeft?: ReactNode;
    onCodeChange: (nextCode: string) => void;
    zoom?: number;
  };

type EditorTextSelection = {
  start: number;
  end: number;
};

type PrismGrammar = Parameters<typeof Prism.highlight>[1];

const CODE_EDITOR_TAB_TEXT = "  ";

const clampTextOffset = (offset: number, textLength: number) => {
  return Math.max(0, Math.min(offset, textLength));
};

const isNodeInside = (parent: HTMLElement, node: Node | null) => {
  return node !== null && (node === parent || parent.contains(node));
};

const getNodeTextOffset = (root: HTMLElement, node: Node, offset: number) => {
  const range = document.createRange();
  range.selectNodeContents(root);

  try {
    range.setEnd(node, offset);
    return range.toString().length;
  } catch {
    return 0;
  }
};

const getEditorSelectionRange = (root: HTMLElement): EditorTextSelection | null => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  if (!isNodeInside(root, selection.anchorNode)) return null;
  if (!isNodeInside(root, selection.focusNode)) return null;

  const anchorOffset = getNodeTextOffset(
    root,
    selection.anchorNode as Node,
    selection.anchorOffset,
  );
  const focusOffset = getNodeTextOffset(
    root,
    selection.focusNode as Node,
    selection.focusOffset,
  );

  return {
    start: Math.min(anchorOffset, focusOffset),
    end: Math.max(anchorOffset, focusOffset),
  };
};

const getTextPositionAtOffset = (root: HTMLElement, offset: number) => {
  const safeOffset = clampTextOffset(offset, root.textContent?.length ?? 0);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = safeOffset;
  let lastTextNode: Text | null = null;
  let currentNode = walker.nextNode();

  while (currentNode) {
    const textNode = currentNode as Text;
    const textLength = textNode.data.length;

    if (remaining <= textLength) {
      return { node: textNode, offset: remaining };
    }

    remaining -= textLength;
    lastTextNode = textNode;
    currentNode = walker.nextNode();
  }

  if (lastTextNode) {
    return { node: lastTextNode, offset: lastTextNode.data.length };
  }

  return { node: root, offset: 0 };
};

const restoreEditorSelection = (
  root: HTMLElement,
  selectionRange: EditorTextSelection,
) => {
  const selection = root.ownerDocument.getSelection();
  if (!selection) return;

  const startPosition = getTextPositionAtOffset(root, selectionRange.start);
  const endPosition = getTextPositionAtOffset(root, selectionRange.end);
  const range = document.createRange();
  range.setStart(startPosition.node, startPosition.offset);
  range.setEnd(endPosition.node, endPosition.offset);
  selection.removeAllRanges();
  selection.addRange(range);
};

const setHighlightedEditorCode = (
  editor: HTMLElement,
  code: string,
  grammar: PrismGrammar,
  language: string,
) => {
  const nextHtml = Prism.highlight(code, grammar, language);
  if (editor.innerHTML !== nextHtml) {
    editor.innerHTML = nextHtml;
  }
};

export const CodeBlockContent = (props: CodeBlockContentProps) => {
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);
  const editorCodeRef = useRef<HTMLElement | null>(null);
  const editorSelectionRef = useRef<EditorTextSelection | null>(null);

  const normalizedCode = useMemo(
    () => (props.code ?? "").replace(/\s+$/, ""),
    [props.code],
  );

  const viewerLanguage = useMemo(
    () => normalizeViewerLanguage(props.language),
    [props.language],
  );
  const editorLanguage = useMemo(
    () => normalizeEditorLanguage(props.language),
    [props.language],
  );
  const editorGrammar = useMemo(
    () => Prism.languages[editorLanguage] ?? Prism.languages.javascript,
    [editorLanguage],
  );
  const labels = useMemo(
    () => getViewerLanguageLabels(viewerLanguage),
    [viewerLanguage],
  );
  const editorCode = props.mode === "editor" ? props.code : "";
  const onEditorCodeChange = props.mode === "editor" ? props.onCodeChange : undefined;

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = null;
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (props.mode !== "editor") return;
    const editor = editorCodeRef.current;
    if (!editor) return;

    const selection = editorSelectionRef.current ?? getEditorSelectionRange(editor);
    setHighlightedEditorCode(editor, editorCode, editorGrammar, editorLanguage);

    if (document.activeElement === editor && selection) {
      restoreEditorSelection(editor, selection);
    }
  }, [props.mode, editorCode, editorGrammar, editorLanguage]);

  const rememberEditorSelection = useCallback(() => {
    const editor = editorCodeRef.current;
    if (!editor) return;
    editorSelectionRef.current = getEditorSelectionRange(editor);
  }, []);

  const replaceEditorSelection = useCallback(
    (insertedText: string) => {
      const editor = editorCodeRef.current;
      if (!editor || !onEditorCodeChange) return;

      const selection = getEditorSelectionRange(editor) ?? {
        start: editorCode.length,
        end: editorCode.length,
      };
      const nextCode = `${editorCode.slice(0, selection.start)}${insertedText}${editorCode.slice(selection.end)}`;
      const nextOffset = selection.start + insertedText.length;
      editorSelectionRef.current = { start: nextOffset, end: nextOffset };
      onEditorCodeChange(nextCode);
    },
    [editorCode, onEditorCodeChange],
  );

  const handleEditorBeforeInput = useCallback(
    (event: ReactFormEvent<HTMLElement>) => {
      const nativeEvent = event.nativeEvent as InputEvent;
      if (
        nativeEvent.inputType !== "insertParagraph" &&
        nativeEvent.inputType !== "insertLineBreak"
      ) {
        return;
      }

      event.preventDefault();
      replaceEditorSelection("\n");
    },
    [replaceEditorSelection],
  );

  const handleEditorInput = useCallback(() => {
    const editor = editorCodeRef.current;
    if (!editor || !onEditorCodeChange) return;

    editorSelectionRef.current = getEditorSelectionRange(editor);
    onEditorCodeChange(editor.textContent ?? "");
  }, [onEditorCodeChange]);

  const handleEditorKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      if (event.key !== "Tab") return;

      event.preventDefault();
      replaceEditorSelection(CODE_EDITOR_TAB_TEXT);
    },
    [replaceEditorSelection],
  );

  const handleEditorPaste = useCallback(
    (event: ReactClipboardEvent<HTMLElement>) => {
      const pastedText = event.clipboardData.getData("text/plain");
      if (pastedText.length === 0) return;

      event.preventDefault();
      replaceEditorSelection(pastedText);
    },
    [replaceEditorSelection],
  );

  const showCopiedForAWhile = useCallback(() => {
    setCopied(true);
    if (copiedTimerRef.current !== null) {
      window.clearTimeout(copiedTimerRef.current);
    }
    copiedTimerRef.current = window.setTimeout(() => {
      setCopied(false);
      copiedTimerRef.current = null;
    }, 2000);
  }, []);

  const handleCopy = useCallback(async () => {
    await webClipboardAdapter.writeText(normalizedCode);
    showCopiedForAWhile();
  }, [normalizedCode, showCopiedForAWhile]);

  const copyButton = (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        void handleCopy();
      }}
      className={cn(
        "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
        "opacity-0 group-hover/code-block:opacity-100 focus-visible:opacity-100 transition-opacity duration-150",
        "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-900/5",
        "focus:outline-none",
        copied && "!opacity-100 text-emerald-600 hover:text-emerald-600",
      )}
      aria-label="コードをコピー"
      type="button"
    >
      {copied ? (
        <Check className="h-[11px] w-[11px]" />
      ) : (
        <Copy className="h-[11px] w-[11px]" />
      )}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );

  if (props.mode === "viewer") {
    const viewerTypographyStyle = buildTypographyStyle({
      fontSizePx: 13,
      lineHeightPx: 20,
      zoom: props.zoom,
    });

    return (
      <div className={props.className}>
        <BlockInset variant="code">
          <CodeBlockFrame
            languageLabel={labels.short}
            languageTitle={labels.full}
            headerRight={copyButton}
          >
            <Highlight
              theme={codeTheme}
              code={normalizedCode}
              language={viewerLanguage}
            >
              {({
                className: preClassName,
                style,
                tokens,
                getLineProps,
                getTokenProps,
              }: RenderProps) => {
                const lastLine = tokens[tokens.length - 1];
                const lastLineIsTrailingEmpty =
                  Array.isArray(lastLine) &&
                  lastLine.every((token) => token.content.trim() === "");
                const visibleTokens = lastLineIsTrailingEmpty
                  ? tokens.slice(0, -1)
                  : tokens;

                return (
                  <pre
                    className={cn(preClassName, "codeBlockPre code-no-wrap")}
                    style={mergeStyles(
                      {
                        color: style.color,
                        backgroundColor: "transparent",
                      },
                      viewerTypographyStyle,
                    )}
                  >
                    <code className="code-no-wrap">
                      {visibleTokens.map((line, i) => (
                        <div key={i} {...getLineProps({ line })}>
                          {line.map((token, key) => (
                            <span key={key} {...getTokenProps({ token })} />
                          ))}
                        </div>
                      ))}
                    </code>
                  </pre>
                );
              }}
            </Highlight>
          </CodeBlockFrame>
        </BlockInset>
      </div>
    );
  }

  const editorTypographyStyle = buildTypographyStyle({
    fontSizePx: 13,
    lineHeightPx: 20,
    zoom: props.zoom,
  });

  const editorMinHeightPx = Math.max(
    56,
    scaleTypographyNumberPx(56, props.zoom),
  );

  return (
    <div className={props.className}>
      <BlockInset variant="code">
        <CodeBlockFrame
          variant="viewer"
          headerLeft={props.headerLeft}
          headerRight={copyButton}
        >
          <pre
            className="codeBlockPre code-editor-no-scroll code-no-wrap"
            style={mergeStyles(
              { minHeight: editorMinHeightPx },
              editorTypographyStyle,
            )}
          >
            <code
              ref={editorCodeRef}
              className="code-editor-content code-no-wrap"
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              role="textbox"
              aria-label="コードエディタ"
              aria-multiline="true"
              onBeforeInput={handleEditorBeforeInput}
              onInput={handleEditorInput}
              onKeyDown={handleEditorKeyDown}
              onKeyUp={rememberEditorSelection}
              onMouseUp={rememberEditorSelection}
              onPaste={handleEditorPaste}
              onSelect={rememberEditorSelection}
            />
          </pre>
        </CodeBlockFrame>
      </BlockInset>
    </div>
  );
};
