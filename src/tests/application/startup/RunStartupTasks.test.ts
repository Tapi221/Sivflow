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
    useSyncV2: false,
    backupResult: false,
    integrityReport: {
      checkedAt: "2026-01-01T00:00:00.000Z",
      totalCards: 0,
      totalFolders: 0,
      issues: [],
      isHealthy: true,
    } as IntegrityReport,
    initializeOperationQueue: vi.fn(async (_userId: string) => {}),
    resetOperationQueue: vi.fn(() => {}),
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

vi.mock("@/features/flags", () => ({
  flags: {
    isEnabled: (name: "USE_SYNC_V2") => {
      if (name !== "USE_SYNC_V2") {
        throw new Error(`Unexpected flag request: ${name}`);
      }
      return state.useSyncV2;
    },
  },
}));

vi.mock("@/utils/queueUtils", () => ({
  initializeOperationQueue: state.initializeOperationQueue,
  resetOperationQueue: state.resetOperationQueue,
}));

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
    state.useSyncV2 = false;
    state.backupResult = false;
    state.integrityReport = {
      checkedAt: "2026-01-01T00:00:00.000Z",
      totalCards: 10,
      totalFolders: 3,
      issues: [],
      isHealthy: true,
    };

    state.initializeOperationQueue.mockReset().mockResolvedValue(undefined);
    state.resetOperationQueue.mockReset();
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

  it("disables the legacy operation queue when Sync V2 is enabled", async () => {
    state.useSyncV2 = true;

    await runStartupTasks({ userId: "user-1" });

    expect(state.resetOperationQueue).toHaveBeenCalledTimes(1);
    expect(state.initializeOperationQueue).not.toHaveBeenCalled();
    expect(state.getInstance).toHaveBeenCalledWith("user-1");
    expect(state.performStartupSync).toHaveBeenCalledTimes(1);
  });

  it("initializes the legacy operation queue when Sync V2 is disabled", async () => {
    state.useSyncV2 = false;

    await runStartupTasks({ userId: "user-2" });

    expect(state.initializeOperationQueue).toHaveBeenCalledWith("user-2");
    expect(state.resetOperationQueue).not.toHaveBeenCalled();
    expect(state.getInstance).not.toHaveBeenCalled();
    expect(state.performStartupSync).not.toHaveBeenCalled();
  });

  it("resets startup tasks by resetting the legacy operation queue", async () => {
    await resetStartupTasks();

    expect(state.resetOperationQueue).toHaveBeenCalledTimes(1);
  });
});
