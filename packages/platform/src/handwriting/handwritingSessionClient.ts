import type { HandwritingSession, HandwritingSessionMessage, HandwritingSessionStatus, HandwritingStrokeDeltaMessage } from "./handwritingSession.types";



type HandwritingSessionUnsubscribe = () => void;
type HandwritingSessionMessageHandler = (message: HandwritingSessionMessage) => void;
type HandwritingSessionStatusHandler = (status: HandwritingSessionStatus) => void;
type HandwritingSessionClient = {
  readonly session: HandwritingSession;
  connect(): Promise<void>;
  disconnect(reason?: string): Promise<void>;
  sendStrokeDelta(message: HandwritingStrokeDeltaMessage): Promise<void>;
  onMessage(handler: HandwritingSessionMessageHandler): HandwritingSessionUnsubscribe;
  onStatusChange(handler: HandwritingSessionStatusHandler): HandwritingSessionUnsubscribe;
};
type HandwritingSessionClientFactory = (session: HandwritingSession) => HandwritingSessionClient;

export type { HandwritingSessionUnsubscribe, HandwritingSessionMessageHandler, HandwritingSessionStatusHandler, HandwritingSessionClient, HandwritingSessionClientFactory };
