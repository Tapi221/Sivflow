import type { InkSide, InkStroke } from "@core/domain/card/ink/inkDocument";



type HandwritingSessionStatus = "idle" | "waiting" | "connected" | "closed" | "error";
type HandwritingDeviceRole = "desktop" | "mobile";
type HandwritingDeviceInfo = {
  id: string;
  role: HandwritingDeviceRole;
  name: string;
  platform: string;
};
type HandwritingSession = {
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
type HandwritingStrokeDeltaMessage = {
  type: "handwriting:stroke-delta";
  sessionId: string;
  cardId: string;
  side: InkSide;
  stroke: InkStroke;
};
type HandwritingSessionControlMessage = {
  type: "handwriting:session-control";
  sessionId: string;
  status: HandwritingSessionStatus;
  reason?: string;
};
type HandwritingSessionMessage = HandwritingStrokeDeltaMessage | HandwritingSessionControlMessage;

export type { HandwritingSessionStatus, HandwritingDeviceRole, HandwritingDeviceInfo, HandwritingSession, HandwritingStrokeDeltaMessage, HandwritingSessionControlMessage, HandwritingSessionMessage };
