import type { InkDocument, InkSide, InkStroke } from "@core/domain/card/ink/inkDocument";
import { INK_DOCUMENT_VERSION, normalizeInkDocument } from "@core/domain/card/ink/inkDocument";
import type { HandwritingStrokeDeltaMessage } from "./handwritingSession.types";



type CreateHandwritingStrokeDeltaInput = {
  sessionId: string;
  cardId: string;
  side: InkSide;
  stroke: InkStroke;
};
type ApplyHandwritingStrokeDeltaInput = {
  document: InkDocument | null | undefined;
  message: HandwritingStrokeDeltaMessage;
  expectedSessionId?: string;
  expectedCardId?: string;
  expectedSide?: InkSide;
  now?: number;
};
type ApplyHandwritingStrokeDeltaResult = {
  document: InkDocument;
  applied: boolean;
  reason?: "session-mismatch" | "card-mismatch" | "side-mismatch" | "invalid-stroke" | "duplicate-stroke";
};



const normalizeStroke = (stroke: InkStroke): InkStroke | null => {
  const document = normalizeInkDocument({ version: INK_DOCUMENT_VERSION, updatedAt: 0, strokes: [stroke] });
  return document.strokes[0] ?? null;
};
const appendStroke = (document: InkDocument, stroke: InkStroke, now: number): InkDocument => ({
  ...document,
  updatedAt: now,
  strokes: [...document.strokes, stroke],
});
const hasStroke = (document: InkDocument, strokeId: string): boolean => {
  return document.strokes.some((stroke) => stroke.id === strokeId);
};
const createHandwritingStrokeDeltaMessage = ({ sessionId, cardId, side, stroke }: CreateHandwritingStrokeDeltaInput): HandwritingStrokeDeltaMessage => {
  const normalizedStroke = normalizeStroke(stroke);

  if (!normalizedStroke) {
    throw new Error("Invalid handwriting stroke delta payload.");
  }

  return {
    type: "handwriting:stroke-delta",
    sessionId,
    cardId,
    side,
    stroke: normalizedStroke,
  };
};
const applyHandwritingStrokeDelta = ({ document, message, expectedSessionId, expectedCardId, expectedSide, now = Date.now() }: ApplyHandwritingStrokeDeltaInput): ApplyHandwritingStrokeDeltaResult => {
  const currentDocument = normalizeInkDocument(document);

  if (expectedSessionId && message.sessionId !== expectedSessionId) {
    return { document: currentDocument, applied: false, reason: "session-mismatch" };
  }

  if (expectedCardId && message.cardId !== expectedCardId) {
    return { document: currentDocument, applied: false, reason: "card-mismatch" };
  }

  if (expectedSide && message.side !== expectedSide) {
    return { document: currentDocument, applied: false, reason: "side-mismatch" };
  }

  const stroke = normalizeStroke(message.stroke);

  if (!stroke) {
    return { document: currentDocument, applied: false, reason: "invalid-stroke" };
  }

  if (hasStroke(currentDocument, stroke.id)) {
    return { document: currentDocument, applied: false, reason: "duplicate-stroke" };
  }

  return { document: appendStroke(currentDocument, stroke, now), applied: true };
};



export { createHandwritingStrokeDeltaMessage, applyHandwritingStrokeDelta };


export type { CreateHandwritingStrokeDeltaInput, ApplyHandwritingStrokeDeltaInput, ApplyHandwritingStrokeDeltaResult };
