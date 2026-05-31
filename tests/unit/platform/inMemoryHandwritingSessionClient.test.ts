import { describe, expect, it, vi } from "vitest";
import type { HandwritingSession } from "../../../packages/platform/src/handwriting/handwritingSession.types";
import { createInMemoryHandwritingSessionClientPair } from "../../../packages/platform/src/handwriting/inMemoryHandwritingSessionClient";
import { createHandwritingStrokeDeltaMessage } from "../../../packages/platform/src/handwriting/handwritingStrokeMessages";
import type { InkStroke } from "../../../packages/core/src/domain/card/ink/inkDocument";

const createSession = (): HandwritingSession => ({
  id: "session-1",
  userId: "user-1",
  cardId: "card-1",
  side: "question",
  desktopDevice: { id: "desktop-1", role: "desktop", name: "Desktop", platform: "windows" },
  status: "waiting",
  createdAt: 1,
  updatedAt: 1,
});

const createStroke = (): InkStroke => ({
  id: "stroke-1",
  tool: "pen",
  color: "#0f172a",
  width: 4,
  opacity: 1,
  createdAt: 1,
  points: [{ x: 10, y: 20, p: 0.5, t: 1 }],
});

describe("InMemoryHandwritingSessionClient", () => {
  it("broadcasts stroke deltas to clients in the same session", async () => {
    const [sender, receiver] = createInMemoryHandwritingSessionClientPair(createSession());
    const onMessage = vi.fn();
    receiver.onMessage(onMessage);

    await sender.connect();
    await receiver.connect();

    const message = createHandwritingStrokeDeltaMessage({ sessionId: "session-1", cardId: "card-1", side: "question", stroke: createStroke() });
    await sender.sendStrokeDelta(message);

    expect(onMessage).toHaveBeenCalledWith(message);
  });

  it("emits status changes on connect and disconnect", async () => {
    const [client] = createInMemoryHandwritingSessionClientPair(createSession());
    const onStatusChange = vi.fn();
    client.onStatusChange(onStatusChange);

    await client.connect();
    await client.disconnect();

    expect(onStatusChange).toHaveBeenNthCalledWith(1, "waiting");
    expect(onStatusChange).toHaveBeenNthCalledWith(2, "connected");
    expect(onStatusChange).toHaveBeenNthCalledWith(3, "closed");
  });

  it("stops receiving messages after unsubscribe", async () => {
    const [sender, receiver] = createInMemoryHandwritingSessionClientPair(createSession());
    const onMessage = vi.fn();
    const unsubscribe = receiver.onMessage(onMessage);

    await sender.connect();
    await receiver.connect();
    unsubscribe();

    const message = createHandwritingStrokeDeltaMessage({ sessionId: "session-1", cardId: "card-1", side: "question", stroke: createStroke() });
    await sender.sendStrokeDelta(message);

    expect(onMessage).not.toHaveBeenCalled();
  });
});
