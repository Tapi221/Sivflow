import { describe, expect, it, vi } from "vitest";
import { emptyTrash, getTrashItems, purgeExpiredTrashItems, restoreTrashItems } from "@core/usecases/trash";
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
  cardSetId?: string | null;
  isDeleted?: boolean;
  deletedAt?: unknown;
};

type TestCardSet = {
  id: string;
  folderId?: string | null;
  isDeleted?: boolean;
  deletedAt?: unknown;
};

type TestDocument = {
  id: string;
  folderId?: string | null;
  isDeleted?: boolean;
  deletedAt?: unknown;
};

const NOW = Date.UTC(2026, 5, 5);
const EXPIRED_DELETED_AT = NOW - 31 * 24 * 60 * 60 * 1000;
const RECENT_DELETED_AT = NOW - 29 * 24 * 60 * 60 * 1000;

const createRepository = ({
  folders = [],
  cards = [],
  cardSets = [],
  documents = [],
}: {
  folders?: TestFolder[];
  cards?: TestCard[];
  cardSets?: TestCardSet[];
  documents?: TestDocument[];
}): TrashRepository<TestFolder, TestCard, TestCardSet, TestDocument> => ({
  loadContext: vi.fn(async () => ({
    folders,
    cards,
    cardSets,
    documents,
    resolveCardFolderId: (card) => card.folderId,
  })),
  restoreFolder: vi.fn(),
  restoreCard: vi.fn(),
  restoreCardSet: vi.fn(),
  restoreDocument: vi.fn(),
  purgeFolder: vi.fn(),
  purgeCard: vi.fn(),
  purgeCardSet: vi.fn(),
  purgeDocument: vi.fn(),
});

describe("trash usecases", () => {
  it("returns folders, cards, card sets, and documents in trash", async () => {
    const repository = createRepository({
      folders: [{ id: "deleted-folder", isDeleted: true }],
      cardSets: [{ id: "deleted-card-set", isDeleted: true }],
      cards: [{ id: "deleted-card", isDeleted: true }],
      documents: [{ id: "deleted-document", isDeleted: true }],
    });

    const result = await getTrashItems({ userId: "user-1", repository });

    expect(result.folders.map((folder) => folder.id)).toEqual(["deleted-folder"]);
    expect(result.cardSets.map((cardSet) => cardSet.id)).toEqual(["deleted-card-set"]);
    expect(result.cards.map((card) => card.id)).toEqual(["deleted-card"]);
    expect(result.documents.map((document) => document.id)).toEqual(["deleted-document"]);
  });

  it("includes card sets, cards, and documents inside deleted folders", async () => {
    const repository = createRepository({
      folders: [{ id: "deleted-folder", isDeleted: true }],
      cardSets: [{ id: "folder-card-set", folderId: "deleted-folder", isDeleted: false }],
      cards: [{ id: "folder-card", folderId: "deleted-folder", isDeleted: false }],
      documents: [{ id: "folder-document", folderId: "deleted-folder", isDeleted: false }],
    });

    const result = await getTrashItems({ userId: "user-1", repository });

    expect(result.cardSets.map((cardSet) => cardSet.id)).toEqual(["folder-card-set"]);
    expect(result.cards.map((card) => card.id)).toEqual(["folder-card"]);
    expect(result.documents.map((document) => document.id)).toEqual(["folder-document"]);
  });

  it("purges expired folders, cards, card sets, and documents", async () => {
    const repository = createRepository({
      folders: [
        { id: "expired-folder", isDeleted: true, deletedAt: EXPIRED_DELETED_AT },
        { id: "recent-folder", isDeleted: true, deletedAt: RECENT_DELETED_AT },
      ],
      cardSets: [
        { id: "expired-card-set", isDeleted: true, deletedAt: EXPIRED_DELETED_AT },
        { id: "recent-card-set", isDeleted: true, deletedAt: RECENT_DELETED_AT },
      ],
      cards: [
        { id: "expired-card", isDeleted: true, deletedAt: EXPIRED_DELETED_AT },
        { id: "recent-card", isDeleted: true, deletedAt: RECENT_DELETED_AT },
      ],
      documents: [
        { id: "expired-document", isDeleted: true, deletedAt: EXPIRED_DELETED_AT },
        { id: "recent-document", isDeleted: true, deletedAt: RECENT_DELETED_AT },
      ],
    });

    const result = await purgeExpiredTrashItems({ userId: "user-1", repository, now: NOW });

    expect(repository.purgeFolder).toHaveBeenCalledWith("user-1", "expired-folder");
    expect(repository.purgeCardSet).toHaveBeenCalledWith("user-1", "expired-card-set");
    expect(repository.purgeCard).toHaveBeenCalledWith("user-1", "expired-card");
    expect(repository.purgeDocument).toHaveBeenCalledWith("user-1", "expired-document");
    expect(repository.purgeFolder).not.toHaveBeenCalledWith("user-1", "recent-folder");
    expect(repository.purgeCardSet).not.toHaveBeenCalledWith("user-1", "recent-card-set");
    expect(repository.purgeCard).not.toHaveBeenCalledWith("user-1", "recent-card");
    expect(repository.purgeDocument).not.toHaveBeenCalledWith("user-1", "recent-document");
    expect(result.folders.map((folder) => folder.id)).toEqual(["expired-folder"]);
    expect(result.cardSets.map((cardSet) => cardSet.id)).toEqual(["expired-card-set"]);
    expect(result.cards.map((card) => card.id)).toEqual(["expired-card"]);
    expect(result.documents.map((document) => document.id)).toEqual(["expired-document"]);
  });

  it("purges children inside an expired deleted folder", async () => {
    const repository = createRepository({
      folders: [{ id: "expired-folder", isDeleted: true, deletedAt: EXPIRED_DELETED_AT }],
      cardSets: [{ id: "folder-card-set", folderId: "expired-folder", isDeleted: false }],
      cards: [{ id: "folder-card", folderId: "expired-folder", isDeleted: false }],
      documents: [{ id: "folder-document", folderId: "expired-folder", isDeleted: false }],
    });

    const result = await purgeExpiredTrashItems({ userId: "user-1", repository, now: NOW });

    expect(repository.purgeFolder).toHaveBeenCalledWith("user-1", "expired-folder");
    expect(repository.purgeCardSet).toHaveBeenCalledWith("user-1", "folder-card-set");
    expect(repository.purgeCard).toHaveBeenCalledWith("user-1", "folder-card");
    expect(repository.purgeDocument).toHaveBeenCalledWith("user-1", "folder-document");
    expect(result.cardSets.map((cardSet) => cardSet.id)).toEqual(["folder-card-set"]);
    expect(result.cards.map((card) => card.id)).toEqual(["folder-card"]);
    expect(result.documents.map((document) => document.id)).toEqual(["folder-document"]);
  });

  it("does not purge deleted items without a valid deletedAt", async () => {
    const repository = createRepository({
      folders: [{ id: "missing-deleted-at", isDeleted: true }],
      cardSets: [{ id: "invalid-card-set-deleted-at", isDeleted: true, deletedAt: "not-a-date" }],
      cards: [{ id: "invalid-card-deleted-at", isDeleted: true, deletedAt: "not-a-date" }],
      documents: [{ id: "invalid-document-deleted-at", isDeleted: true, deletedAt: "not-a-date" }],
    });

    await purgeExpiredTrashItems({ userId: "user-1", repository, now: NOW });

    expect(repository.purgeFolder).not.toHaveBeenCalled();
    expect(repository.purgeCardSet).not.toHaveBeenCalled();
    expect(repository.purgeCard).not.toHaveBeenCalled();
    expect(repository.purgeDocument).not.toHaveBeenCalled();
  });

  it("restores every selected trash item type", async () => {
    const repository = createRepository({
      folders: [{ id: "folder", isDeleted: true }],
      cardSets: [{ id: "card-set", isDeleted: true }],
      cards: [{ id: "card", isDeleted: true }],
      documents: [{ id: "document", isDeleted: true }],
    });

    await restoreTrashItems({ userId: "user-1", repository, folderIds: ["folder"], cardSetIds: ["card-set"], cardIds: ["card"], documentIds: ["document"] });

    expect(repository.restoreFolder).toHaveBeenCalledWith("user-1", "folder");
    expect(repository.restoreCardSet).toHaveBeenCalledWith("user-1", "card-set");
    expect(repository.restoreCard).toHaveBeenCalledWith("user-1", "card");
    expect(repository.restoreDocument).toHaveBeenCalledWith("user-1", "document");
  });

  it("empties every trash item type", async () => {
    const repository = createRepository({
      folders: [{ id: "folder", isDeleted: true }],
      cardSets: [{ id: "card-set", isDeleted: true }],
      cards: [{ id: "card", isDeleted: true }],
      documents: [{ id: "document", isDeleted: true }],
    });

    await emptyTrash({ userId: "user-1", repository });

    expect(repository.purgeFolder).toHaveBeenCalledWith("user-1", "folder");
    expect(repository.purgeCardSet).toHaveBeenCalledWith("user-1", "card-set");
    expect(repository.purgeCard).toHaveBeenCalledWith("user-1", "card");
    expect(repository.purgeDocument).toHaveBeenCalledWith("user-1", "document");
  });
});
