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

import { resetStartupTasks, runStartupTasks } from "@/application/startup/RunStartupTasks";

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

  it("整合性チェックの前に startup sync を実行する", async () => {
    await runStartupTasks({ userId: "user-1" });

    expect(state.getInstance).toHaveBeenCalledWith("user-1");
    expect(state.performStartupSync).toHaveBeenCalledTimes(1);
    expect(state.checkDataIntegrityExecute).toHaveBeenCalledTimes(1);
    expect(
      state.performStartupSync.mock.invocationCallOrder[0],
    ).toBeLessThan(state.checkDataIntegrityExecute.mock.invocationCallOrder[0]);
  });

  it("startup sync step の前に disposed なら sync を開始しない", async () => {
    const isDisposed = vi
      .fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    await runStartupTasks({
      userId: "user-2",
      isDisposed,
    });

    expect(state.getInstance).not.toHaveBeenCalled();
    expect(state.performStartupSync).not.toHaveBeenCalled();
    expect(state.checkDataIntegrityExecute).not.toHaveBeenCalled();
  });

  it("API 互換性のため resetStartupTasks を no-op に保つ", async () => {
    await expect(resetStartupTasks()).resolves.toBeUndefined();
    expect(state.getInstance).not.toHaveBeenCalled();
    expect(state.performStartupSync).not.toHaveBeenCalled();
  });
});
