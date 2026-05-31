import { describe, expect, it } from "vitest";
import { createEmptyInkDocument, type InkStroke } from "../../../packages/core/src/domain/card/ink/inkDocument";
import { applyHandwritingStrokeDelta, createHandwritingStrokeDeltaMessage } from "../../../packages/platform/src/handwriting/handwritingStrokeMessages";

const createStroke = (id = "stroke-1"): InkStroke => ({
  id,
  tool: "pen",
  color: "#0f172a",
  width: 4,
  opacity: 1,
  createdAt: 1,
  points: [{ x: 10, y: 20, p: 0.5, t: 1 }],
});

describe("handwritingStrokeMessages", () => {
  it("creates a normalized stroke delta message", () => {
    const stroke = createStroke();
    const message = createHandwritingStrokeDeltaMessage({ sessionId: "session-1", cardId: "card-1", side: "question", stroke });

    expect(message).toEqual({ type: "handwriting:stroke-delta", sessionId: "session-1", cardId: "card-1", side: "question", stroke });
  });

  it("applies a stroke delta to an ink document", () => {
    const message = createHandwritingStrokeDeltaMessage({ sessionId: "session-1", cardId: "card-1", side: "answer", stroke: createStroke() });
    const result = applyHandwritingStrokeDelta({ document: createEmptyInkDocument(), message, expectedSessionId: "session-1", expectedCardId: "card-1", expectedSide: "answer", now: 123 });

    expect(result.applied).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.document.updatedAt).toBe(123);
    expect(result.document.strokes).toHaveLength(1);
    expect(result.document.strokes[0].id).toBe("stroke-1");
  });

  it("rejects mismatched session/card/side", () => {
    const message = createHandwritingStrokeDeltaMessage({ sessionId: "session-1", cardId: "card-1", side: "question", stroke: createStroke() });

    expect(applyHandwritingStrokeDelta({ document: null, message, expectedSessionId: "other" }).reason).toBe("session-mismatch");
    expect(applyHandwritingStrokeDelta({ document: null, message, expectedCardId: "other" }).reason).toBe("card-mismatch");
    expect(applyHandwritingStrokeDelta({ document: null, message, expectedSide: "answer" }).reason).toBe("side-mismatch");
  });

  it("rejects duplicate strokes", () => {
    const stroke = createStroke();
    const message = createHandwritingStrokeDeltaMessage({ sessionId: "session-1", cardId: "card-1", side: "question", stroke });
    const document = { ...createEmptyInkDocument(), strokes: [stroke] };
    const result = applyHandwritingStrokeDelta({ document, message });

    expect(result.applied).toBe(false);
    expect(result.reason).toBe("duplicate-stroke");
    expect(result.document.strokes).toHaveLength(1);
  });
});
