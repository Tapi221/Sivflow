import type { CardBlock } from "@/types/domain/card";

const EDITOR_NON_INSERTABLE_BLOCK_TYPES = new Set<CardBlock["type"]>([
  "audio",
  "reference",
]);

type CreateEditorBlockParams = Readonly<{
  prefix: "question" | "answer";
  type: Exclude<CardBlock["type"], "audio" | "reference">;
  id: string;
  rowOffset: number;
  offsetRows: number;
  parentBlockId?: string;
}>;

export const isEditorInsertableBlockType = (
  type: CardBlock["type"],
): type is Exclude<CardBlock["type"], "audio" | "reference"> => {
  return !EDITOR_NON_INSERTABLE_BLOCK_TYPES.has(type);
};

export const createEditorBlock = ({
  prefix: _prefix,
  type,
  id,
  rowOffset,
  offsetRows,
  parentBlockId,
}: CreateEditorBlockParams): CardBlock => {
  return {
    id,
    type,
    content: "",
    images: [],
    audios: [],
    code: type === "code" ? { language: "javascript", code: "" } : undefined,
    math: type === "math" ? { latex: "", displayMode: "block" } : undefined,
    markdown: type === "markdown" ? "" : undefined,
    pdf: type === "pdf" ? null : undefined,
    pdfPageNumber: type === "pdf" ? 1 : undefined,
    questionTitle: type === "question" ? "" : undefined,
    questionAnswer: type === "question" ? "" : undefined,
    rowOffset:
      type === "text" ||
      type === "question" ||
      type === "image" ||
      type === "markdown" ||
      type === "pdf"
        ? rowOffset
        : undefined,
    offsetRows:
      type === "code" || type === "math" ? Math.max(0, offsetRows) : undefined,
    parentBlockId: parentBlockId ?? undefined,
    orderIndex: 0,
  };
};
