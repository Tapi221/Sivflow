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

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const createEmptyInkDocument = (): InkDocument => ({ version: INK_DOCUMENT_VERSION, updatedAt: 0, strokes: [] });
const normalizeInkDocument = (value: unknown): InkDocument => {
  if (!value || typeof value !== "object") {
    return createEmptyInkDocument();
  }

  const maybe = value as Partial<InkDocument>;
  const strokes = Array.isArray(maybe.strokes)
    ? maybe.strokes
      .map((stroke): InkStroke | null => {
        if (!stroke || typeof stroke !== "object") return null;

        const raw = stroke as Partial<InkStroke>;
        const tool: InkTool =
          raw.tool === "highlighter" ? "highlighter" : "pen";
        const color =
          typeof raw.color === "string" && raw.color.trim().length > 0
            ? raw.color
            : "#1f2937";
        const width = isFiniteNumber(raw.width) ? clamp(raw.width, 1, 96) : 3;
        const opacity = isFiniteNumber(raw.opacity)
          ? clamp(raw.opacity, 0.05, 1)
          : 1;
        const createdAt = isFiniteNumber(raw.createdAt)
          ? raw.createdAt
          : Date.now();

        const points = Array.isArray(raw.points)
          ? raw.points
            .map((point): InkPoint | null => {
              if (!point || typeof point !== "object") return null;
              const maybePoint = point as Partial<InkPoint>;
              if (!isFiniteNumber(maybePoint.x) || !isFiniteNumber(maybePoint.y)) {
                return null;
              }

              const t = isFiniteNumber(maybePoint.t)
                ? maybePoint.t
                : Date.now();
              const p = isFiniteNumber(maybePoint.p)
                ? clamp(maybePoint.p, 0, 1)
                : 0.5;
              return { x: maybePoint.x, y: maybePoint.y, t, p };
            })
            .filter((point): point is InkPoint => point !== null)
          : [];

        if (points.length === 0) return null;

        return {
          id:
            typeof raw.id === "string" && raw.id.trim().length > 0
              ? raw.id
              : `${createdAt}-${Math.random().toString(16).slice(2)}`,
          tool,
          color,
          width,
          opacity,
          points,
          createdAt,
        };
      })
      .filter((stroke): stroke is InkStroke => stroke !== null)
    : [];

  const deletedStrokeIds = Array.isArray(maybe.deletedStrokeIds)
    ? maybe.deletedStrokeIds.filter((id): id is string => typeof id === "string")
    : undefined;

  return {
    version: isFiniteNumber(maybe.version)
      ? maybe.version
      : INK_DOCUMENT_VERSION,
    updatedAt: isFiniteNumber(maybe.updatedAt) ? maybe.updatedAt : 0,
    strokes,
    ...(deletedStrokeIds && deletedStrokeIds.length > 0
      ? { deletedStrokeIds }
      : {}),
  };
};
const cloneInkDocument = (doc: InkDocument): InkDocument => ({ version: doc.version, updatedAt: doc.updatedAt, deletedStrokeIds: doc.deletedStrokeIds ? [...doc.deletedStrokeIds] : undefined, strokes: doc.strokes.map((stroke) => ({ ...stroke, points: stroke.points.map((point) => ({ ...point })) })) });

export { INK_DOCUMENT_VERSION, INK_PAPER_W, INK_PAPER_H, createEmptyInkDocument, normalizeInkDocument, cloneInkDocument };
export type { InkSide, InkTool, InkEditTool, InkPoint, InkStroke, InkDocument };
