import { describe, expect, it, vi } from "vitest";
import { purgeExpiredTrashItems } from "@core/usecases/trash";
import type { TrashRepository } from "@core/usecases/trash";

type TestFolder = {
  id: string;
  isDeleted?: boolean;
  deletedAt?: unknown;
  parentFolderId?: string | null;
};

type TestCard = {
  id: string;
  folderId?: string | null;
  isDeleted?: boolean;
  deletedAt?: unknown;
};

const NOW = Date.UTC(2026, 5, 5);
const EXPIRED_DELETED_AT = NOW - 31 * 24 * 60 * 60 * 1000;
const RECENT_DELETED_AT = NOW - 29 * 24 * 60 * 60 * 1000;

const createRepository = ({ folders, cards }: { folders: TestFolder[]; cards: TestCard[] }): TrashRepository<TestFolder, TestCard> => ({
  loadContext: vi.fn(async () => ({
    folders,
    cards,
    resolveCardFolderId: (card) => card.folderId,
  })),
  restoreFolder: vi.fn(),
  restoreCard: vi.fn(),
  purgeFolder: vi.fn(),
  purgeCard: vi.fn(),
});

describe("purgeExpiredTrashItems", () => {
  it("purges items whose deletedAt is older than the retention period", async () => {
    const repository = createRepository({
      folders: [
        { id: "expired-folder", isDeleted: true, deletedAt: EXPIRED_DELETED_AT },
        { id: "recent-folder", isDeleted: true, deletedAt: RECENT_DELETED_AT },
      ],
      cards: [
        { id: "expired-card", isDeleted: true, deletedAt: EXPIRED_DELETED_AT },
        { id: "recent-card", isDeleted: true, deletedAt: RECENT_DELETED_AT },
      ],
    });

    const result = await purgeExpiredTrashItems({ userId: "user-1", repository, now: NOW });

    expect(repository.purgeFolder).toHaveBeenCalledTimes(1);
    expect(repository.purgeFolder).toHaveBeenCalledWith("user-1", "expired-folder");
    expect(repository.purgeCard).toHaveBeenCalledTimes(1);
    expect(repository.purgeCard).toHaveBeenCalledWith("user-1", "expired-card");
    expect(result.folders.map((folder) => folder.id)).toEqual(["expired-folder"]);
    expect(result.cards.map((card) => card.id)).toEqual(["expired-card"]);
  });

  it("purges cards inside an expired deleted folder", async () => {
    const repository = createRepository({
      folders: [{ id: "expired-folder", isDeleted: true, deletedAt: EXPIRED_DELETED_AT }],
      cards: [{ id: "folder-card", folderId: "expired-folder", isDeleted: false }],
    });

    const result = await purgeExpiredTrashItems({ userId: "user-1", repository, now: NOW });

    expect(repository.purgeFolder).toHaveBeenCalledWith("user-1", "expired-folder");
    expect(repository.purgeCard).toHaveBeenCalledWith("user-1", "folder-card");
    expect(result.cards.map((card) => card.id)).toEqual(["folder-card"]);
  });

  it("does not purge deleted items without a valid deletedAt", async () => {
    const repository = createRepository({
      folders: [{ id: "missing-deleted-at", isDeleted: true }],
      cards: [{ id: "invalid-deleted-at", isDeleted: true, deletedAt: "not-a-date" }],
    });

    await purgeExpiredTrashItems({ userId: "user-1", repository, now: NOW });

    expect(repository.purgeFolder).not.toHaveBeenCalled();
    expect(repository.purgeCard).not.toHaveBeenCalled();
  });
});
