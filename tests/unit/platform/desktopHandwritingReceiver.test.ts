import { describe, expect, it } from "vitest";
import { createEmptyInkDocument, type InkStroke } from "../../../packages/core/src/domain/card/ink/inkDocument";
import { receiveDesktopHandwritingMessage, type DesktopHandwritingReceiverSession } from "../../../packages/platform/src/handwriting/desktopHandwritingReceiver";
import { createHandwritingStrokeDeltaMessage } from "../../../packages/platform/src/handwriting/handwritingStrokeMessages";

const createSession = (): DesktopHandwritingReceiverSession => ({
  id: "session-1",
  cardId: "card-1",
  side: "question",
  status: "connected",
});

const createStroke = (id = "stroke-1"): InkStroke => ({
  id,
  tool: "pen",
  color: "#0f172a",
  width: 4,
  opacity: 1,
  createdAt: 1,
  points: [{ x: 10, y: 20, p: 0.5, t: 1 }],
});

describe("desktopHandwritingReceiver", () => {
  it("アクティブなインク文書に stroke delta を適用する", () => {
    const session = createSession();
    const message = createHandwritingStrokeDeltaMessage({ sessionId: session.id, cardId: session.cardId, side: session.side, stroke: createStroke() });
    const result = receiveDesktopHandwritingMessage({ document: createEmptyInkDocument(), session, message, now: 123 });

    expect(result.applied).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.status).toBe("connected");
    expect(result.document.updatedAt).toBe(123);
    expect(result.document.strokes).toHaveLength(1);
    expect(result.document.strokes[0].id).toBe("stroke-1");
  });

  it("別 session 宛ての message を拒否する", () => {
    const session = createSession();
    const message = createHandwritingStrokeDeltaMessage({ sessionId: "other-session", cardId: session.cardId, side: session.side, stroke: createStroke() });
    const result = receiveDesktopHandwritingMessage({ document: null, session, message });

    expect(result.applied).toBe(false);
    expect(result.reason).toBe("session-mismatch");
    expect(result.document.strokes).toHaveLength(0);
  });

  it("別 card または side 宛ての message を拒否する", () => {
    const session = createSession();
    const wrongCardMessage = createHandwritingStrokeDeltaMessage({ sessionId: session.id, cardId: "other-card", side: session.side, stroke: createStroke("wrong-card") });
    const wrongSideMessage = createHandwritingStrokeDeltaMessage({ sessionId: session.id, cardId: session.cardId, side: "answer", stroke: createStroke("wrong-side") });

    expect(receiveDesktopHandwritingMessage({ document: null, session, message: wrongCardMessage }).reason).toBe("card-mismatch");
    expect(receiveDesktopHandwritingMessage({ document: null, session, message: wrongSideMessage }).reason).toBe("side-mismatch");
  });

  it("制御 message から session status の変更を返し、document は変更しない", () => {
    const session = createSession();
    const document = { ...createEmptyInkDocument(), strokes: [createStroke()] };
    const result = receiveDesktopHandwritingMessage({ document, session, message: { type: "handwriting:session-control", sessionId: session.id, status: "closed", reason: "done" } });

    expect(result.applied).toBe(false);
    expect(result.reason).toBe("control-message");
    expect(result.status).toBe("closed");
    expect(result.document.strokes).toHaveLength(1);
  });
});
