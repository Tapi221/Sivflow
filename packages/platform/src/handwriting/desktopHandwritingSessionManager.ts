import { normalizeInkDocument, type InkDocument, type InkSide } from "@core/domain/card/ink/inkDocument";
import { receiveDesktopHandwritingMessage, type DesktopHandwritingReceiverReason, type DesktopHandwritingReceiverSession } from "./desktopHandwritingReceiver";
import { attachMobileDeviceToHandwritingSession, closeHandwritingSession, createDesktopHandwritingSession, failHandwritingSession } from "./handwritingSessionLifecycle";
import type { HandwritingDeviceInfo, HandwritingSession, HandwritingSessionMessage } from "./handwritingSession.types";

export type DesktopHandwritingDocumentKey = `${string}:${InkSide}`;

export type DesktopHandwritingSessionManagerState = {
  activeSessionId: string | null;
  documents: Record<DesktopHandwritingDocumentKey, InkDocument>;
  sessions: Record<string, HandwritingSession>;
};

export type StartDesktopHandwritingSessionInput = {
  state: DesktopHandwritingSessionManagerState;
  id: string;
  userId: string;
  cardId: string;
  side: InkSide;
  desktopDevice: HandwritingDeviceInfo;
  document?: InkDocument | null;
  now?: number;
};

export type AttachMobileDeviceToDesktopHandwritingSessionInput = {
  state: DesktopHandwritingSessionManagerState;
  sessionId: string;
  mobileDevice: HandwritingDeviceInfo;
  now?: number;
};

export type ReceiveDesktopHandwritingSessionManagerMessageInput = {
  state: DesktopHandwritingSessionManagerState;
  message: HandwritingSessionMessage;
  now?: number;
};

export type ReceiveDesktopHandwritingSessionManagerMessageResult = {
  state: DesktopHandwritingSessionManagerState;
  applied: boolean;
  reason?: DesktopHandwritingReceiverReason | "session-not-found";
};

export const createDesktopHandwritingSessionManagerState = (): DesktopHandwritingSessionManagerState => ({
  activeSessionId: null,
  documents: {},
  sessions: {},
});

export const getDesktopHandwritingDocumentKey = (cardId: string, side: InkSide): DesktopHandwritingDocumentKey => {
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

export const startDesktopHandwritingSession = ({ state, id, userId, cardId, side, desktopDevice, document, now }: StartDesktopHandwritingSessionInput): DesktopHandwritingSessionManagerState => {
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

export const attachMobileDeviceToDesktopHandwritingSession = ({ state, sessionId, mobileDevice, now }: AttachMobileDeviceToDesktopHandwritingSessionInput): DesktopHandwritingSessionManagerState => {
  const session = state.sessions[sessionId];
  if (!session) return state;

  return updateSession(state, attachMobileDeviceToHandwritingSession({ session, mobileDevice, now }));
};

export const receiveDesktopHandwritingSessionManagerMessage = ({ state, message, now }: ReceiveDesktopHandwritingSessionManagerMessageInput): ReceiveDesktopHandwritingSessionManagerMessageResult => {
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

export const closeDesktopHandwritingSession = (state: DesktopHandwritingSessionManagerState, sessionId: string, now = Date.now()): DesktopHandwritingSessionManagerState => {
  const session = state.sessions[sessionId];
  if (!session) return state;

  const nextSession = closeHandwritingSession(session, now);
  const nextState = updateSession(state, nextSession);

  return {
    ...nextState,
    activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
  };
};

export const failDesktopHandwritingSession = (state: DesktopHandwritingSessionManagerState, sessionId: string, now = Date.now()): DesktopHandwritingSessionManagerState => {
  const session = state.sessions[sessionId];
  if (!session) return state;

  const nextSession = failHandwritingSession(session, now);
  const nextState = updateSession(state, nextSession);

  return {
    ...nextState,
    activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
  };
};
