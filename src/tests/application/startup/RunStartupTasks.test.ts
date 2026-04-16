// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

type IntegrityReport = {
  checkedAt: string;
  totalCards: number;
  totalFolders: number;
  issues: Array<{ code: string }>;
  isHealthy: boolean;
};

const state = vi.hoisted(() => {
  return {
    backupResult: false,
    integrityReport: {
      checkedAt: "2026-01-01T00:00:00.000Z",
      totalCards: 0,
      totalFolders: 0,
      issues: [],
      isHealthy: true,
    } as IntegrityReport,
    migrateLegacyImagesToAssets: vi.fn(async (_params: { userId: string }) => ({
      scannedCards: 0,
      scannedImages: 0,
    })),
    performAutoBackupExecute: vi.fn(async (_userId: string) => false),
    checkDataIntegrityExecute: vi.fn(
      async () =>
        ({
          checkedAt: "2026-01-01T00:00:00.000Z",
          totalCards: 0,
          totalFolders: 0,
          issues: [],
          isHealthy: true,
        }) as Promise<IntegrityReport>,
    ),
    performStartupSync: vi.fn(async () => {}),
    getInstance: vi.fn(async () => ({
      performStartupSync: vi.fn(async () => {}),
    })),
  };
});

vi.mock("@/application/startup/MigrateLegacyImagesToAssets", () => ({
  migrateLegacyImagesToAssets: state.migrateLegacyImagesToAssets,
}));

vi.mock("@/application/backup/PerformAutoBackup", () => ({
  createPerformAutoBackupUseCase: () => ({
    execute: state.performAutoBackupExecute,
  }),
}));

vi.mock("@/application/integrity/CheckDataIntegrity", () => ({
  createCheckDataIntegrityUseCase: () => ({
    execute: state.checkDataIntegrityExecute,
  }),
}));

vi.mock("@/services/SyncServiceFactory", () => ({
  SyncServiceFactory: {
    getInstance: state.getInstance,
  },
}));

vi.mock("@/infrastructure/browser-storage/LocalStorageBackupStore", () => ({
  localStorageBackupStore: {},
}));

vi.mock("@/utils/logSanitizer", () => ({
  sanitizeForLog: <T>(value: T): T => value,
}));

import {
  resetStartupTasks,
  runStartupTasks,
} from "@/application/startup/RunStartupTasks";

describe("RunStartupTasks", () => {
  beforeEach(() => {
    state.backupResult = false;
    state.integrityReport = {
      checkedAt: "2026-01-01T00:00:00.000Z",
      totalCards: 10,
      totalFolders: 3,
      issues: [],
      isHealthy: true,
    };

    state.migrateLegacyImagesToAssets.mockReset().mockResolvedValue({
      scannedCards: 0,
      scannedImages: 0,
    });
    state.performAutoBackupExecute
      .mockReset()
      .mockImplementation(async () => state.backupResult);
    state.checkDataIntegrityExecute
      .mockReset()
      .mockImplementation(async () => state.integrityReport);
    state.performStartupSync.mockReset().mockResolvedValue(undefined);
    state.getInstance.mockReset().mockResolvedValue({
      performStartupSync: state.performStartupSync,
    });
  });

  it("always performs startup sync via SyncServiceFactory", async () => {
    await runStartupTasks({ userId: "user-1" });

    expect(state.getInstance).toHaveBeenCalledWith("user-1");
    expect(state.performStartupSync).toHaveBeenCalledTimes(1);
  });

  it("does not start sync when disposed before the startup sync step", async () => {
    const isDisposed = vi.fn(() => true);

    await runStartupTasks({
      userId: "user-2",
      isDisposed,
    });

    expect(state.getInstance).toHaveBeenCalledWith("user-2");
    expect(state.performStartupSync).not.toHaveBeenCalled();
  });

  it("keeps resetStartupTasks as a no-op for API compatibility", async () => {
    await expect(resetStartupTasks()).resolves.toBeUndefined();
    expect(state.getInstance).not.toHaveBeenCalled();
    expect(state.performStartupSync).not.toHaveBeenCalled();
  });
});
