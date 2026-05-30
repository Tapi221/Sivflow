import type { HandwritingSession, HandwritingSessionMessage, HandwritingSessionStatus, HandwritingStrokeDeltaMessage } from "./handwritingSession.types";

export type HandwritingSessionUnsubscribe = () => void;

export type HandwritingSessionMessageHandler = (message: HandwritingSessionMessage) => void;

export type HandwritingSessionStatusHandler = (status: HandwritingSessionStatus) => void;

export type HandwritingSessionClient = {
  readonly session: HandwritingSession;
  connect(): Promise<void>;
  disconnect(reason?: string): Promise<void>;
  sendStrokeDelta(message: HandwritingStrokeDeltaMessage): Promise<void>;
  onMessage(handler: HandwritingSessionMessageHandler): HandwritingSessionUnsubscribe;
  onStatusChange(handler: HandwritingSessionStatusHandler): HandwritingSessionUnsubscribe;
};

export type HandwritingSessionClientFactory = (session: HandwritingSession) => HandwritingSessionClient;
