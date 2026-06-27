type InkSide = "question" | "answer";
type InkTool = "pen" | "highlighter";
type InkEditTool = InkTool | "eraser";
type InkPoint = {
  x: number;
  y: number;
  t: number;
  p: number;
};
type InkStroke = {
  id: string;
  tool: InkTool;
  color: string;
  width: number;
  opacity: number;
  points: InkPoint[];
  createdAt: number;
};
type InkDocument = {
  version: number;
  updatedAt: number;
  strokes: InkStroke[];
  deletedStrokeIds?: string[];
};

const INK_DOCUMENT_VERSION = 2;
const INK_PAPER_W = 1000;
const INK_PAPER_H = 1414;
const createEmptyInkDocument = (): InkDocument => ({ version: INK_DOCUMENT_VERSION, updatedAt: 0, strokes: [] });
const normalizeInkDocument = (value: unknown): InkDocument => {
  if (!value || typeof value !== "object") return createEmptyInkDocument();

  const document = value as Partial<InkDocument>;
  return {
    version: typeof document.version === "number" ? document.version : INK_DOCUMENT_VERSION,
    updatedAt: typeof document.updatedAt === "number" ? document.updatedAt : 0,
    strokes: Array.isArray(document.strokes) ? document.strokes : [],
    deletedStrokeIds: Array.isArray(document.deletedStrokeIds) ? document.deletedStrokeIds : undefined,
  };
};
const cloneInkDocument = (doc: InkDocument): InkDocument => ({
  ...doc,
  deletedStrokeIds: doc.deletedStrokeIds ? [...doc.deletedStrokeIds] : undefined,
  strokes: doc.strokes.map((stroke) => ({ ...stroke, points: stroke.points.map((point) => ({ ...point })) })),
});

export { INK_DOCUMENT_VERSION, INK_PAPER_W, INK_PAPER_H, createEmptyInkDocument, normalizeInkDocument, cloneInkDocument };
export type { InkSide, InkTool, InkEditTool, InkPoint, InkStroke, InkDocument };
