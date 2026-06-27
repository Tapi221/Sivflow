import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  getTelemetryContext,
  resetTelemetryState,
  sendTelemetryEvent,
  setTelemetryTransport,
  type TelemetryEvent,
} from '../telemetry';

function createEvent(eventName: string): TelemetryEvent {
  return {
    schemaVersion: 1,
    eventName,
    clientId: 'test-client',
    eventId: `event-${eventName}`,
  };
}

beforeEach(() => {
  delete (globalThis as any).BUILD_CONFIG;
  resetTelemetryState();
  vi.clearAllMocks();
});

describe('telemetry state', () => {
  test('falls back to stable channel when build config is missing', () => {
    expect(getTelemetryContext().channel).toBe('stable');
  });

  test('uses valid build channel from build config', () => {
    (globalThis as any).BUILD_CONFIG = { appBuildType: 'beta' };

    resetTelemetryState();

    expect(getTelemetryContext().channel).toBe('beta');
  });

  test('clears pending events and transport on reset', async () => {
    await sendTelemetryEvent(createEvent('before_reset'));

    resetTelemetryState();

    const track = vi.fn().mockResolvedValue({ queued: false });
    const setContext = vi.fn();
    setTelemetryTransport({ setContext, track });

    expect(setContext).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'stable' })
    );
    expect(track).not.toHaveBeenCalled();
  });

  test('drops oldest pending event when queue reaches limit', async () => {
    for (let i = 0; i <= 500; i++) {
      await sendTelemetryEvent(createEvent(`queued_${i}`));
    }

    const track = vi.fn().mockResolvedValue({ queued: false });
    setTelemetryTransport({ setContext: vi.fn(), track });

    expect(track).toHaveBeenCalledTimes(500);
    expect(track.mock.calls[0]?.[0].eventName).toBe('queued_1');
  });
});
