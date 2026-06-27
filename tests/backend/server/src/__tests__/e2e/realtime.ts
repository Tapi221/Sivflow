import type { RealtimeAck, RealtimeRequestInputOf, RealtimeRequestName, RealtimeRequestOutputOf, } from '@affine/realtime';
import { io } from 'socket.io-client';
import type { Socket as SocketIOClient } from 'socket.io-client';
import type { Response } from 'supertest';
import type { MockedUser } from '../mocks';
import type { TestingApp } from './create-app';

const REALTIME_CLIENT_VERSION = '0.26.0';
const WS_TIMEOUT_MS = 5_000;

const cookieHeader = (res: Response) => {
  return (res.get('Set-Cookie') ?? [])
    .map(cookie => cookie.split(';')[0])
    .join('; ');
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string) => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timeout (${timeoutMs}ms): ${label}`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const waitForConnect = async (socket: SocketIOClient) => {
  if (socket.connected) {
    return;
  }

  await withTimeout(
    new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    }),
    WS_TIMEOUT_MS,
    'realtime socket connect'
  );
};

export const createRealtimeClient = async (app: TestingApp, user: MockedUser) => { await app.login(user);
  
  const cookies = app.getCookies();
  const cookieStr = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

  const socket = io(app.url(), {
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
    extraHeaders: {
      cookie: cookieStr,
    },
  });
  await waitForConnect(socket);
  return socket;
};

export const realtimeRequest = async <Op extends RealtimeRequestName>(socket: SocketIOClient, op: Op, input: RealtimeRequestInputOf<Op>): Promise<RealtimeRequestOutputOf<Op>> => { const ack = await withTimeout( new Promise<RealtimeAck<RealtimeRequestOutputOf<Op>>>(resolve => { socket.emit( 'realtime:request', { op, input, clientVersion: REALTIME_CLIENT_VERSION }, (res: RealtimeAck<RealtimeRequestOutputOf<Op>>) => resolve(res) );
    }),
    WS_TIMEOUT_MS,
    `realtime request ${op}`
  );

  if ('error' in ack) {
    throw new Error(`${ack.error.name}: ${ack.error.message}`);
  }

  return ack.data;
};
