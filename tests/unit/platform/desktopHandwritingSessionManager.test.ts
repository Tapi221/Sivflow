import { describe, expect, it } from "vitest";
import { type InkStroke } from "../../../packages/core/src/domain/card/ink/inkDocument";
import { attachMobileDeviceToDesktopHandwritingSession, closeDesktopHandwritingSession, createDesktopHandwritingSessionManagerState, failDesktopHandwritingSession, getDesktopHandwritingDocumentKey, receiveDesktopHandwritingSessionManagerMessage, startDesktopHandwritingSession } from "../../../packages/platform/src/handwriting/desktopHandwritingSessionManager";
import { createHandwritingStrokeDeltaMessage } from "../../../packages/platform/src/handwriting/handwritingStrokeMessages";
import type { HandwritingDeviceInfo } from "../../../packages/platform/src/handwriting/handwritingSession.types";

const desktopDevice: HandwritingDeviceInfo = {
  id: "desktop-1",
  role: "desktop",
  name: "Desktop",
  platform: "windows",
};

const mobileDevice: HandwritingDeviceInfo = {
  id: "ipad-1",
  role: "mobile",
  name: "iPad",
  platform: "ios",
};

const createStroke = (id = "stroke-1"): InkStroke => ({
  id,
  tool: "pen",
  color: "#0f172a",
  width: 4,
  opacity: 1,
  createdAt: 1,
  points: [{ x: 10, y: 20, p: 0.5, t: 1 }],
});

describe("desktopHandwritingSessionManager", () => {
  it("starts a desktop handwriting session and creates its document slot", () => {
    const state = startDesktopHandwritingSession({ state: createDesktopHandwritingSessionManagerState(), id: "session-1", userId: "user-1", cardId: "card-1", side: "question", desktopDevice, now: 100 });
    const documentKey = getDesktopHandwritingDocumentKey("card-1", "question");

    expect(state.activeSessionId).toBe("session-1");
    expect(state.sessions["session-1"].status).toBe("waiting");
    expect(state.documents[documentKey].strokes).toHaveLength(0);
  });

  it("attaches a mobile device and marks the session connected", () => {
    const started = startDesktopHandwritingSession({ state: createDesktopHandwritingSessionManagerState(), id: "session-1", userId: "user-1", cardId: "card-1", side: "answer", desktopDevice, now: 100 });
    const connected = attachMobileDeviceToDesktopHandwritingSession({ state: started, sessionId: "session-1", mobileDevice, now: 200 });

    expect(connected.sessions["session-1"].mobileDevice).toEqual(mobileDevice);
    expect(connected.sessions["session-1"].status).toBe("connected");
    expect(connected.sessions["session-1"].updatedAt).toBe(200);
  });

  it("receives a stroke delta and merges it into the session document", () => {
    const started = startDesktopHandwritingSession({ state: createDesktopHandwritingSessionManagerState(), id: "session-1", userId: "user-1", cardId: "card-1", side: "question", desktopDevice, now: 100 });
    const message = createHandwritingStrokeDeltaMessage({ sessionId: "session-1", cardId: "card-1", side: "question", stroke: createStroke() });
    const result = receiveDesktopHandwritingSessionManagerMessage({ state: started, message, now: 300 });
    const documentKey = getDesktopHandwritingDocumentKey("card-1", "question");

    expect(result.applied).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.state.documents[documentKey].updatedAt).toBe(300);
    expect(result.state.documents[documentKey].strokes[0].id).toBe("stroke-1");
  });

  it("rejects messages for unknown sessions", () => {
    const state = createDesktopHandwritingSessionManagerState();
    const message = createHandwritingStrokeDeltaMessage({ sessionId: "missing", cardId: "card-1", side: "question", stroke: createStroke() });
    const result = receiveDesktopHandwritingSessionManagerMessage({ state, message });

    expect(result.applied).toBe(false);
    expect(result.reason).toBe("session-not-found");
    expect(result.state).toBe(state);
  });

  it("updates session status from control messages", () => {
    const started = startDesktopHandwritingSession({ state: createDesktopHandwritingSessionManagerState(), id: "session-1", userId: "user-1", cardId: "card-1", side: "question", desktopDevice, now: 100 });
    const result = receiveDesktopHandwritingSessionManagerMessage({ state: started, message: { type: "handwriting:session-control", sessionId: "session-1", status: "closed", reason: "done" }, now: 400 });

    expect(result.applied).toBe(false);
    expect(result.reason).toBe("control-message");
    expect(result.state.sessions["session-1"].status).toBe("closed");
    expect(result.state.sessions["session-1"].updatedAt).toBe(400);
  });

  it("closes or fails a session and clears it when active", () => {
    const started = startDesktopHandwritingSession({ state: createDesktopHandwritingSessionManagerState(), id: "session-1", userId: "user-1", cardId: "card-1", side: "question", desktopDevice, now: 100 });
    const closed = closeDesktopHandwritingSession(started, "session-1", 500);
    const failed = failDesktopHandwritingSession(started, "session-1", 600);

    expect(closed.activeSessionId).toBeNull();
    expect(closed.sessions["session-1"].status).toBe("closed");
    expect(failed.activeSessionId).toBeNull();
    expect(failed.sessions["session-1"].status).toBe("error");
  });
});
