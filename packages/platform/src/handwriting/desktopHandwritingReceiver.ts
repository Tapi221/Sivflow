import type { InkDocument } from "@core/domain/card/ink/inkDocument";
import { normalizeInkDocument } from "@core/domain/card/ink/inkDocument";
import type { HandwritingSession, HandwritingSessionMessage, HandwritingSessionStatus } from "./handwritingSession.types";
import type { ApplyHandwritingStrokeDeltaResult } from "./handwritingStrokeMessages";
import { applyHandwritingStrokeDelta } from "./handwritingStrokeMessages";



type DesktopHandwritingReceiverSession = Pick<HandwritingSession, "id" | "cardId" | "side" | "status">;
type ReceiveDesktopHandwritingMessageInput = {
  document: InkDocument | null | undefined;
  session: DesktopHandwritingReceiverSession;
  message: HandwritingSessionMessage;
  now?: number;
};
type DesktopHandwritingReceiverReason = | ApplyHandwritingStrokeDeltaResult["reason"] | "control-message" | "session-mismatch";
type ReceiveDesktopHandwritingMessageResult = {
  document: InkDocument;
  applied: boolean;
  status: HandwritingSessionStatus;
  reason?: DesktopHandwritingReceiverReason;
};



const isSessionMessage = (
  message: HandwritingSessionMessage,
  session: DesktopHandwritingReceiverSession,
): boolean => {
  return message.sessionId === session.id;
};
const receiveDesktopHandwritingMessage = ({ document, session, message, now }: ReceiveDesktopHandwritingMessageInput): ReceiveDesktopHandwritingMessageResult => {
  const currentDocument = normalizeInkDocument(document);

  if (!isSessionMessage(message, session)) {
    return { document: currentDocument, applied: false, status: session.status, reason: "session-mismatch" };
  }

  if (message.type === "handwriting:session-control") {
    return { document: currentDocument, applied: false, status: message.status, reason: "control-message" };
  }

  const result = applyHandwritingStrokeDelta({
    document: currentDocument,
    message,
    expectedSessionId: session.id,
    expectedCardId: session.cardId,
    expectedSide: session.side,
    now,
  });

  return {
    document: result.document,
    applied: result.applied,
    status: session.status,
    reason: result.reason,
  };
};



export { receiveDesktopHandwritingMessage };


export type { DesktopHandwritingReceiverSession, ReceiveDesktopHandwritingMessageInput, DesktopHandwritingReceiverReason, ReceiveDesktopHandwritingMessageResult };
