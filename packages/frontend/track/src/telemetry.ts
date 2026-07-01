import { DebugLogger } from '@affine/debug';

import { getBuildChannel } from './build-config';

type TelemetryChannel = 'stable' | 'beta' | 'internal' | 'local';

export type TelemetryEvent = {
  schemaVersion: 1;
  eventName: string;
  params?: Record<string, unknown>;
  userProperties?: Record<string, unknown>;
  userId?: string;
  clientId: string;
  sessionId?: string | number;
  eventId: string;
  timestampMicros?: number;
  context?: {
    appVersion?: string;
    editorVersion?: string;
    environment?: string;
    distribution?: string;
    channel?: TelemetryChannel;
    isDesktop?: boolean;
    isMobile?: boolean;
    locale?: string;
    timezone?: string;
    url?: string;
    referrer?: string;
  };
};

export type TelemetryContext = {
  isAuthed: boolean;
  isSelfHosted: boolean;
  channel: TelemetryChannel;
  userId?: string;
  userProperties?: Record<string, unknown>;
  officialEndpoint: string;
};

export type TelemetryAck =
  | { ok: true; accepted: number; dropped: number }
  | { ok: false; error: { name: string; message: string } };

export type TelemetryTransport = {
  setContext: (context: TelemetryContext) => Promise<void> | void;
  track: (event: TelemetryEvent) => Promise<{ queued: boolean }> | void;
  pageview?: (event: TelemetryEvent) => Promise<{ queued: boolean }> | void;
  flush?: () => Promise<TelemetryAck> | void;
};

type TelemetryContextUpdate = Partial<TelemetryContext> & {
  userProperties?: Record<string, unknown>;
};

type TelemetryContextUpdateOptions = {
  replaceUserProperties?: boolean;
};

const logger = new DebugLogger('telemetry');
const pendingEvents: TelemetryEvent[] = [];
const PENDING_LIMIT = 500;

function createInitialContext(): TelemetryContext {
  return {
    isAuthed: false,
    isSelfHosted: false,
    channel: getBuildChannel(),
    officialEndpoint: '',
    userProperties: {},
  };
}

let context: TelemetryContext = createInitialContext();
let transport: TelemetryTransport | null = null;

export function setTelemetryTransport(next: TelemetryTransport | null) {
  transport = next;
  if (!transport) {
    return;
  }

  applyTransportContext(context);
  flushPending().catch(error => {
    logger.error('failed to flush pending telemetry events', error);
  });
}

export function setTelemetryContext(
  update: TelemetryContextUpdate,
  options: TelemetryContextUpdateOptions = {}
) {
  const nextUserProps = options.replaceUserProperties
    ? (update.userProperties ?? {})
    : {
        ...context.userProperties,
        ...update.userProperties,
      };

  context = {
    ...context,
    ...update,
    userProperties: nextUserProps,
  };

  applyTransportContext(context);
}

export function getTelemetryContext() {
  return context;
}

export function resetTelemetryState() {
  context = createInitialContext();
  transport = null;
  pendingEvents.splice(0, pendingEvents.length);
}

export async function sendTelemetryEvent(event: TelemetryEvent) {
  if (!transport) {
    enqueuePending(event);
    return { queued: true };
  }

  return await transport.track(event);
}

export async function flushTelemetry() {
  if (!transport?.flush) {
    return { ok: true, accepted: 0, dropped: 0 } as const;
  }
  return await transport.flush();
}

async function flushPending() {
  if (!transport || pendingEvents.length === 0) {
    return;
  }

  const events = pendingEvents.splice(0, pendingEvents.length);
  for (const event of events) {
    await transport.track(event);
  }
}

function enqueuePending(event: TelemetryEvent) {
  if (pendingEvents.length >= PENDING_LIMIT) {
    const dropped = pendingEvents.shift();
    logger.warn('pending telemetry queue is full; dropped oldest event', {
      eventName: dropped?.eventName,
      eventId: dropped?.eventId,
    });
  }
  pendingEvents.push(event);
}

function applyTransportContext(next: TelemetryContext) {
  if (!transport) {
    return;
  }
  void Promise.resolve(transport.setContext(next)).catch(error => {
    logger.error('failed to set telemetry context', error);
  });
}
