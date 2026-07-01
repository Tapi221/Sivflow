import { getMarkdown } from "@platejs/ai";
import { serializeMd } from "@platejs/markdown";
import type { UIMessage } from "ai";
import dedent from "dedent";
import type { SlateEditor } from "platejs";
import { KEYS, RangeApi } from "platejs";
import type { ChatMessage } from "./types";



type StructuredPromptSections = {
  context?: string;
  examples?: string[] | string;
  history?: string;
  instruction?: string;
  outputFormatting?: string;
  prefilledResponse?: string;
  rules?: string;
  task?: string;
  taskContext?: string;
  thinking?: string;
  tone?: string;
};



const SELECTION_START = "<Selection>";
const SELECTION_END = "</Selection>";



const tag = (tag: string, content?: string | null) => {
  if (!content) return "";

  return [`<${tag}>`, content, `</${tag}>`].join("\n");
};
const inlineTag = (tag: string, content?: string | null) => {
  if (!content) return "";

  return [`<${tag}>`, content, `</${tag}>`].join("");
};
const sections = (sections: (boolean | string | null | undefined)[]) => sections.filter(Boolean).join("\n\n");
const list = (items: string[] | undefined) => items ? items.filter(Boolean).map((item) => `- ${item}`).join("\n") : "";
const buildStructuredPrompt = ({ context, examples, history, instruction, outputFormatting, prefilledResponse, rules, task, taskContext, thinking, tone }: StructuredPromptSections) => {
  const formattedExamples = Array.isArray(examples) ? examples.map((example) => {
    const indentedContent = example.split("\n").map((line) => (line ? ` ${line}` : "")).join("\n");

    return ["  <example>", indentedContent, "  </example>"].join("\n");
  })
    .join("\n")
    : examples;

  return sections([
    taskContext,
    tone,
    task && tag("task", task),
    instruction &&
    dedent`
        Here is the user's instruction (this is what you need to respond to):
        ${tag("instruction", instruction)}
      `,
    context &&
    dedent`
        Here is the context you should reference when answering the user:
        ${tag("context", context)}
      `,
    rules && tag("rules", rules),
    formattedExamples &&
    "Here are some examples of how to respond in a standard interaction:\n" +
    tag("examples", formattedExamples),
    history &&
    dedent`
        Here is the conversation history (between the user and you) prior to the current instruction:
        ${tag("history", history)}
      `,
    thinking && tag("thinking", thinking),
    outputFormatting && tag("outputFormatting", outputFormatting),
    (prefilledResponse ?? null) !== null && tag("prefilledResponse", prefilledResponse ?? ""),
  ]);
};
const getTextFromMessage = (message: UIMessage): string => {
  return message.parts.filter((part) => part.type === "text").map((part) => part.text).join("");
};
const formatTextFromMessages = (messages: ChatMessage[], options?: { limit?: number; }): string => {
  if (!messages || messages.length <= 1) return "";

  const historyMessages = options?.limit ? messages.slice(-options.limit) : messages;

  return historyMessages
    .map((message) => {
      const text = getTextFromMessage(message).trim();

      if (!text) return null;

      const role = message.role.toUpperCase();

      return `${role}: ${text}`;
    })
    .filter(Boolean)
    .join("\n");
};
const getLastUserInstruction = (messages: ChatMessage[]): string => {
  if (!messages || messages.length === 0) return "";

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");

  if (!lastUserMessage) return "";

  return getTextFromMessage(lastUserMessage).trim();
};
const addSelection = (editor: SlateEditor) => {
  if (!editor.selection) return;
  if (editor.api.isExpanded()) {
    const [start, end] = RangeApi.edges(editor.selection);

    editor.tf.withoutNormalizing(() => {
      editor.tf.insertText(SELECTION_END, {
        at: end,
      });

      editor.tf.insertText(SELECTION_START, {
        at: start,
      });
    });
  }
};
const removeEscapeSelection = (editor: SlateEditor, text: string) => {
  let newText = text
    .replace(`\\${SELECTION_START}`, SELECTION_START)
    .replace(`\\${SELECTION_END}`, SELECTION_END);

  if (!newText.includes(SELECTION_END)) {
    const [_, end] = RangeApi.edges(editor.selection!);

    const node = editor.api.block({ at: end.path });

    if (!node) return newText;
    if (editor.api.isVoid(node[0])) {
      const voidString = serializeMd(editor, { value: [node[0]] });

      const idx = newText.lastIndexOf(voidString);

      if (idx !== -1) {
        newText =
          newText.slice(0, idx) +
          voidString.trimEnd() +
          SELECTION_END +
          newText.slice(idx + voidString.length);
      }
    }
  }

  return newText;
};
const isMultiBlocks = (editor: SlateEditor) => {
  const blocks = editor.api.blocks({ mode: "lowest" });

  return blocks.length > 1;
};
const getMarkdownWithSelection = (editor: SlateEditor) => removeEscapeSelection(editor, getMarkdown(editor, { type: "block" }));
const isSelectionInTable = (editor: SlateEditor): boolean => {
  if (!editor.selection) return false;

  const tableEntry = editor.api.block({
    at: editor.selection,
    match: { type: KEYS.table },
  });

  return !!tableEntry;
};
const isSingleCellSelection = (editor: SlateEditor): boolean => {
  if (!editor.selection) return false;

  const cells = Array.from(
    editor.api.nodes({
      at: editor.selection,
      match: { type: KEYS.td },
    }),
  );

  return cells.length === 1;
};



export { tag, inlineTag, sections, list, buildStructuredPrompt, getTextFromMessage, formatTextFromMessages, getLastUserInstruction, addSelection, isMultiBlocks, getMarkdownWithSelection, isSelectionInTable, isSingleCellSelection };


export type { StructuredPromptSections };
