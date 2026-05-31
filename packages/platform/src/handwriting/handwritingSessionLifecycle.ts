import type { InkSide } from "@core/domain/card/ink/inkDocument";
import type { HandwritingDeviceInfo, HandwritingSession, HandwritingSessionStatus } from "./handwritingSession.types";

export type CreateDesktopHandwritingSessionInput = {
  id: string;
  userId: string;
  cardId: string;
  side: InkSide;
  desktopDevice: HandwritingDeviceInfo;
  now?: number;
};

export type AttachMobileDeviceToHandwritingSessionInput = {
  session: HandwritingSession;
  mobileDevice: HandwritingDeviceInfo;
  now?: number;
};

export type UpdateHandwritingSessionStatusInput = {
  session: HandwritingSession;
  status: HandwritingSessionStatus;
  now?: number;
};

export const createDesktopHandwritingSession = ({ id, userId, cardId, side, desktopDevice, now = Date.now() }: CreateDesktopHandwritingSessionInput): HandwritingSession => ({
  id,
  userId,
  cardId,
  side,
  desktopDevice,
  status: "waiting",
  createdAt: now,
  updatedAt: now,
});

export const attachMobileDeviceToHandwritingSession = ({ session, mobileDevice, now = Date.now() }: AttachMobileDeviceToHandwritingSessionInput): HandwritingSession => ({
  ...session,
  mobileDevice,
  status: "connected",
  updatedAt: now,
});

export const updateHandwritingSessionStatus = ({ session, status, now = Date.now() }: UpdateHandwritingSessionStatusInput): HandwritingSession => ({
  ...session,
  status,
  updatedAt: now,
});

export const closeHandwritingSession = (session: HandwritingSession, now = Date.now()): HandwritingSession => {
  return updateHandwritingSessionStatus({ session, status: "closed", now });
};

export const failHandwritingSession = (session: HandwritingSession, now = Date.now()): HandwritingSession => {
  return updateHandwritingSessionStatus({ session, status: "error", now });
};

export const isHandwritingSessionActive = (session: Pick<HandwritingSession, "status">): boolean => {
  return session.status === "waiting" || session.status === "connected";
};
