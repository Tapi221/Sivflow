import { describe, expect, it } from "vitest";
import { attachMobileDeviceToHandwritingSession, closeHandwritingSession, createDesktopHandwritingSession, failHandwritingSession, isHandwritingSessionActive, updateHandwritingSessionStatus } from "../../../packages/platform/src/handwriting/handwritingSessionLifecycle";
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

describe("手書きセッションのライフサイクル", () => {
  it("待機中のデスクトップ手書きセッションを作成する", () => {
    const session = createDesktopHandwritingSession({ id: "session-1", userId: "user-1", cardId: "card-1", side: "question", desktopDevice, now: 100 });

    expect(session).toEqual({
      id: "session-1",
      userId: "user-1",
      cardId: "card-1",
      side: "question",
      desktopDevice,
      status: "waiting",
      createdAt: 100,
      updatedAt: 100,
    });
  });

  it("モバイル端末を紐づけてセッションを接続済みにする", () => {
    const session = createDesktopHandwritingSession({ id: "session-1", userId: "user-1", cardId: "card-1", side: "answer", desktopDevice, now: 100 });
    const connected = attachMobileDeviceToHandwritingSession({ session, mobileDevice, now: 200 });

    expect(connected.mobileDevice).toEqual(mobileDevice);
    expect(connected.status).toBe("connected");
    expect(connected.createdAt).toBe(100);
    expect(connected.updatedAt).toBe(200);
  });

  it("識別子系フィールドを変えずにセッションステータスを更新する", () => {
    const session = createDesktopHandwritingSession({ id: "session-1", userId: "user-1", cardId: "card-1", side: "question", desktopDevice, now: 100 });
    const updated = updateHandwritingSessionStatus({ session, status: "closed", now: 300 });

    expect(updated.id).toBe(session.id);
    expect(updated.cardId).toBe(session.cardId);
    expect(updated.status).toBe("closed");
    expect(updated.updatedAt).toBe(300);
  });

  it("セッションを終了または失敗状態にする", () => {
    const session = createDesktopHandwritingSession({ id: "session-1", userId: "user-1", cardId: "card-1", side: "question", desktopDevice, now: 100 });

    expect(closeHandwritingSession(session, 200).status).toBe("closed");
    expect(failHandwritingSession(session, 300).status).toBe("error");
  });

  it("待機中と接続済みのセッションをアクティブとして扱う", () => {
    expect(isHandwritingSessionActive({ status: "idle" })).toBe(false);
    expect(isHandwritingSessionActive({ status: "waiting" })).toBe(true);
    expect(isHandwritingSessionActive({ status: "connected" })).toBe(true);
    expect(isHandwritingSessionActive({ status: "closed" })).toBe(false);
    expect(isHandwritingSessionActive({ status: "error" })).toBe(false);
  });
});