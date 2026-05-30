import type { InkSide, InkStroke } from "@core/domain/card/ink/inkDocument";

export type HandwritingSessionStatus = "idle" | "waiting" | "connected" | "closed" | "error";

export type HandwritingDeviceRole = "desktop" | "mobile";

export type HandwritingDeviceInfo = {
  id: string;
  role: HandwritingDeviceRole;
  name: string;
  platform: string;
};

export type HandwritingSession = {
  id: string;
  userId: string;
  cardId: string;
  side: InkSide;
  desktopDevice: HandwritingDeviceInfo;
  mobileDevice?: HandwritingDeviceInfo;
  status: HandwritingSessionStatus;
  createdAt: number;
  updatedAt: number;
};

export type HandwritingStrokeDeltaMessage = {
  type: "handwriting:stroke-delta";
  sessionId: string;
  cardId: string;
  side: InkSide;
  stroke: InkStroke;
};

export type HandwritingSessionControlMessage = {
  type: "handwriting:session-control";
  sessionId: string;
  status: HandwritingSessionStatus;
  reason?: string;
};

export type HandwritingSessionMessage = HandwritingStrokeDeltaMessage | HandwritingSessionControlMessage;
