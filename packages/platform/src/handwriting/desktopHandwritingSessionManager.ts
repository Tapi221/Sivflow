import type { InkDocument, InkSide } from "@core/domain/card/ink/inkDocument";
import { normalizeInkDocument } from "@core/domain/card/ink/inkDocument";
import type { DesktopHandwritingReceiverReason, DesktopHandwritingReceiverSession } from "./desktopHandwritingReceiver";
import { receiveDesktopHandwritingMessage } from "./desktopHandwritingReceiver";
import type { HandwritingDeviceInfo, HandwritingSession, HandwritingSessionMessage } from "./handwritingSession.types";
import { attachMobileDeviceToHandwritingSession, closeHandwritingSession, createDesktopHandwritingSession, failHandwritingSession } from "./handwritingSessionLifecycle";



type DesktopHandwritingDocumentKey = `${string}:${InkSide}`;
type DesktopHandwritingSessionManagerState = {
  activeSessionId: string | null;
  documents: Record<DesktopHandwritingDocumentKey, InkDocument>;
  sessions: Record<string, HandwritingSession>;
};
type StartDesktopHandwritingSessionInput = {
  state: DesktopHandwritingSessionManagerState;
  id: string;
  userId: string;
  cardId: string;
  side: InkSide;
  desktopDevice: HandwritingDeviceInfo;
  document?: InkDocument | null;
  now?: number;
};
type AttachMobileDeviceToDesktopHandwritingSessionInput = {
  state: DesktopHandwritingSessionManagerState;
  sessionId: string;
  mobileDevice: HandwritingDeviceInfo;
  now?: number;
};
type ReceiveDesktopHandwritingSessionManagerMessageInput = {
  state: DesktopHandwritingSessionManagerState;
  message: HandwritingSessionMessage;
  now?: number;
};
type ReceiveDesktopHandwritingSessionManagerMessageResult = {
  state: DesktopHandwritingSessionManagerState;
  applied: boolean;
  reason?: DesktopHandwritingReceiverReason | "session-not-found";
};



const createDesktopHandwritingSessionManagerState = (): DesktopHandwritingSessionManagerState => ({ activeSessionId: null, documents: {}, sessions: {} });
const getDesktopHandwritingDocumentKey = (cardId: string, side: InkSide): DesktopHandwritingDocumentKey => {
  return `${cardId}:${side}`;
};
const toReceiverSession = (session: HandwritingSession): DesktopHandwritingReceiverSession => ({
  id: session.id,
  cardId: session.cardId,
  side: session.side,
  status: session.status,
});
const updateSession = (state: DesktopHandwritingSessionManagerState, session: HandwritingSession): DesktopHandwritingSessionManagerState => ({
  ...state,
  sessions: {
    ...state.sessions,
    [session.id]: session,
  },
});
const updateDocument = (state: DesktopHandwritingSessionManagerState, key: DesktopHandwritingDocumentKey, document: InkDocument): DesktopHandwritingSessionManagerState => ({
  ...state,
  documents: {
    ...state.documents,
    [key]: document,
  },
});
const startDesktopHandwritingSession = ({ state, id, userId, cardId, side, desktopDevice, document, now }: StartDesktopHandwritingSessionInput): DesktopHandwritingSessionManagerState => {
  const session = createDesktopHandwritingSession({ id, userId, cardId, side, desktopDevice, now });
  const documentKey = getDesktopHandwritingDocumentKey(cardId, side);
  const nextState = updateDocument(state, documentKey, normalizeInkDocument(document));

  return {
    ...nextState,
    activeSessionId: session.id,
    sessions: {
      ...nextState.sessions,
      [session.id]: session,
    },
  };
};
const attachMobileDeviceToDesktopHandwritingSession = ({ state, sessionId, mobileDevice, now }: AttachMobileDeviceToDesktopHandwritingSessionInput): DesktopHandwritingSessionManagerState => {
  const session = state.sessions[sessionId];
  if (!session) return state;

  return updateSession(state, attachMobileDeviceToHandwritingSession({ session, mobileDevice, now }));
};
const receiveDesktopHandwritingSessionManagerMessage = ({ state, message, now }: ReceiveDesktopHandwritingSessionManagerMessageInput): ReceiveDesktopHandwritingSessionManagerMessageResult => {
  const session = state.sessions[message.sessionId];

  if (!session) {
    return { state, applied: false, reason: "session-not-found" };
  }

  const documentKey = getDesktopHandwritingDocumentKey(session.cardId, session.side);
  const result = receiveDesktopHandwritingMessage({
    document: state.documents[documentKey],
    session: toReceiverSession(session),
    message,
    now,
  });

  const nextSession = result.status === session.status ? session : { ...session, status: result.status, updatedAt: now ?? Date.now() };
  const nextState = updateSession(updateDocument(state, documentKey, result.document), nextSession);

  return {
    state: nextState,
    applied: result.applied,
    reason: result.reason,
  };
};
const closeDesktopHandwritingSession = (state: DesktopHandwritingSessionManagerState, sessionId: string, now = Date.now()): DesktopHandwritingSessionManagerState => {
  const session = state.sessions[sessionId];
  if (!session) return state;

  const nextSession = closeHandwritingSession(session, now);
  const nextState = updateSession(state, nextSession);

  return {
    ...nextState,
    activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
  };
};
const failDesktopHandwritingSession = (state: DesktopHandwritingSessionManagerState, sessionId: string, now = Date.now()): DesktopHandwritingSessionManagerState => {
  const session = state.sessions[sessionId];
  if (!session) return state;

  const nextSession = failHandwritingSession(session, now);
  const nextState = updateSession(state, nextSession);

  return {
    ...nextState,
    activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
  };
};



export { createDesktopHandwritingSessionManagerState, getDesktopHandwritingDocumentKey, startDesktopHandwritingSession, attachMobileDeviceToDesktopHandwritingSession, receiveDesktopHandwritingSessionManagerMessage, closeDesktopHandwritingSession, failDesktopHandwritingSession };


export type { DesktopHandwritingDocumentKey, DesktopHandwritingSessionManagerState, StartDesktopHandwritingSessionInput, AttachMobileDeviceToDesktopHandwritingSessionInput, ReceiveDesktopHandwritingSessionManagerMessageInput, ReceiveDesktopHandwritingSessionManagerMessageResult };
