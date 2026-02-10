// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LocalDB,
  getLocalDBTelemetrySnapshot,
  getLocalDBRuntimeStatus,
  getLocalDb,
  resetLocalDBForLogout,
  telemetryOncePerSession,
} from '../localDB';

describe('LocalDB resilience', () => {
  const resetStaticState = () => {
    const localDBClass = LocalDB as any;
    localDBClass.persistentOpenDisabled = false;
    localDBClass.openingPromise = null;
    localDBClass.openingUserId = null;
    localDBClass.resettingPromise = null;
    localDBClass.generationBumpedUsers = new Set();
  };

  beforeEach(() => {
    LocalDB.clearInstance();
    resetStaticState();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    LocalDB.clearInstance();
    resetStaticState();
    vi.restoreAllMocks();
  });

  it('returns the same in-flight promise for concurrent getInstance calls', async () => {
    const openSpy = vi
      .spyOn(Dexie.prototype, 'open')
      .mockImplementation(function mockOpen(this: Dexie) {
        return new Promise((resolve) => {
          setTimeout(() => resolve(this), 25);
        }) as any;
      });

    const [db1, db2] = await Promise.all([getLocalDb('test-user'), getLocalDb('test-user')]);

    expect(db1).toBe(db2);
    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps logout reset best-effort and stores failure reason', async () => {
    LocalDB.clearInstance();
    const deleteSpy = vi
      .spyOn(Dexie, 'delete')
      .mockRejectedValue(new Error('forced reset failure'));

    await resetLocalDBForLogout('test-user');

    const status = getLocalDBRuntimeStatus();
    expect(deleteSpy).toHaveBeenCalled();
    expect(status.resetFailedReason).toContain('delete failed');
  });

  it('switches to fallback mode on backing-store UnknownError and does not retry infinitely', async () => {
    const backingStoreError = Object.assign(
      new Error('Internal error opening backing store for indexedDB.open.'),
      { name: 'UnknownError' }
    );

    const openSpy = vi
      .spyOn(Dexie.prototype, 'open')
      .mockRejectedValue(backingStoreError);

    const db = await getLocalDb('test-user');
    const status = getLocalDBRuntimeStatus();

    expect((db as any).isInMemoryFallback).toBe(true);
    expect(status.mode).toBe('fallback');
    expect(status.generationBumped).toBe(true);
    expect(status.fallbackReason?.toLowerCase()).toContain('backing store');
    expect(openSpy).toHaveBeenCalledTimes(1);

    await getLocalDb('test-user');
    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('bumps generation at most once per session for repeated backing-store failures', async () => {
    const backingStoreError = Object.assign(
      new Error('Internal error opening backing store for indexedDB.open.'),
      { name: 'UnknownError' }
    );

    vi.spyOn(Dexie.prototype, 'open').mockRejectedValue(backingStoreError);

    await getLocalDb('bump-user');
    const firstGeneration = window.localStorage.getItem('flashcard.localdb.generation.bump-user');
    expect(firstGeneration).toBe('1');

    await resetLocalDBForLogout('bump-user');
    await getLocalDb('bump-user');
    const secondGeneration = window.localStorage.getItem('flashcard.localdb.generation.bump-user');
    expect(secondGeneration).toBe('1');
  });

  it('attempts to delete all known generations during logout reset', async () => {
    const originalDatabases = indexedDB.databases;
    try {
      (indexedDB as any).databases = vi.fn().mockResolvedValue([
        { name: 'FlashcardMasterDB_reset-user_v19_g2' },
        { name: 'FlashcardMasterDB_reset-user_v19_g3' },
        { name: 'unrelated_db' },
      ]);

      const deleteSpy = vi.spyOn(Dexie, 'delete').mockResolvedValue(undefined as any);

      await resetLocalDBForLogout('reset-user');

      const deletedNames = deleteSpy.mock.calls.map(([name]) => String(name));
      expect(deletedNames).toContain('FlashcardMasterDB_reset-user_v19_g0');
      expect(deletedNames).toContain('FlashcardMasterDB_reset-user_v19_g1');
      expect(deletedNames).toContain('FlashcardMasterDB_reset-user_v19_g2');
      expect(deletedNames).toContain('FlashcardMasterDB_reset-user_v19_g3');
      expect(deletedNames).toContain('FlashcardMasterDB_reset-user');
    } finally {
      (indexedDB as any).databases = originalDatabases;
    }
  });

  it('exposes localdb telemetry snapshot keys', async () => {
    const snapshot = getLocalDBTelemetrySnapshot();
    expect(snapshot).toHaveProperty('localdb_mode');
    expect(snapshot).toHaveProperty('localdb_reason_code');
    expect(snapshot).toHaveProperty('localdb_fallback_reason');
    expect(snapshot).toHaveProperty('localdb_generation_bumped');
    expect(snapshot).toHaveProperty('localdb_reset_failed');
  });

  it('emits localdb telemetry once per session key', () => {
    expect(telemetryOncePerSession('localdb_runtime')).toBe(true);
    expect(telemetryOncePerSession('localdb_runtime')).toBe(false);
  });
});
