// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getLocalDb, LocalDB } from "../localDB";

const rawPutCard = async (dbName: string, card: unknown): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const openReq = indexedDB.open(dbName);
    openReq.onerror = () =>
      reject(openReq.error ?? new Error("Failed to open IndexedDB"));
    openReq.onsuccess = () => {
      const idb = openReq.result;
      const tx = idb.transaction("cards", "readwrite");
      tx.objectStore("cards").put(card);
      tx.oncomplete = () => {
        idb.close();
        resolve();
      };
      tx.onerror = () => {
        idb.close();
        reject(tx.error ?? new Error("Failed to write raw card"));
      };
      tx.onabort = () => {
        idb.close();
        reject(tx.error ?? new Error("Raw card write aborted"));
      };
    };
  });
};

describe("LocalDB repairDataIntegrity", () => {
  beforeEach(() => {
    LocalDB.clearInstance();
  });

  afterEach(() => {
    LocalDB.clearInstance();
  });

  it("repairs deleted flag mismatch, missing folder and mixed timestamp types", async () => {
    const userId = "repair-user-a";
    const db = await getLocalDb(userId);

    await db.cards.put({
      id: "card-a",
      userId,
      folderId: null,
      isDeleted: true,
      deletedAt: null,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
      questionText: "Q",
      answerText: "A",
      blocks: [],
    } as unknown);

    const result = await db.repairDataIntegrity(userId);
    const repaired = await db.cards.get("card-a");

    expect(result.issues.some((i) => i.code === "DELETED_FLAG_MISMATCH")).toBe(
      true,
    );
    expect(result.issues.some((i) => i.code === "MISSING_FOLDER")).toBe(true);
    expect(result.issues.some((i) => i.code === "TIMESTAMP_TYPE_MIXED")).toBe(
      true,
    );
    expect(repaired?.isDeleted).toBe(false);
    expect(repaired?.folderId).toBe("RESCUE_ORPHANS_FOLDER");
    expect(repaired?.createdAt instanceof Date).toBe(true);
    expect(repaired?.updatedAt instanceof Date).toBe(true);
  });

  it("repairs block order/text mismatch and remains idempotent", async () => {
    const userId = "repair-user-b";
    const db = await getLocalDb(userId);

    await db.folders.put({
      id: "folder-1",
      folderId: "folder-1",
      folderName: "F1",
      userId,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown);

    await db.cards.put({
      id: "card-b",
      userId,
      folderId: "folder-1",
      isDeleted: false,
      questionText: "outdated-q",
      answerText: "outdated-a",
      createdAt: new Date(),
      updatedAt: new Date(),
      blocks: [
        { side: "question", type: "question", text: "Q from block" },
        { side: "answer", type: "answer", text: "A from block" },
      ],
    } as unknown);

    const first = await db.repairDataIntegrity(userId);
    const onceRepaired = await db.cards.get("card-b");
    const second = await db.repairDataIntegrity(userId);

    expect(
      first.issues.some((i) => i.code === "BLOCK_ORDER_INDEX_MISSING"),
    ).toBe(true);
    expect(first.issues.some((i) => i.code === "TEXT_BLOCK_MISMATCH")).toBe(
      true,
    );
    expect(onceRepaired?.blocks?.[0]?.orderIndex).toBe(0);
    expect(onceRepaired?.blocks?.[1]?.orderIndex).toBe(1);
    expect(onceRepaired?.questionText).toBe("Q from block");
    expect(onceRepaired?.answerText).toBe("A from block");
    expect(
      second.issues.some((i) => i.code === "BLOCK_ORDER_INDEX_MISSING"),
    ).toBe(false);
    expect(second.issues.some((i) => i.code === "TEXT_BLOCK_MISMATCH")).toBe(
      false,
    );
  });

  it("repairs persisted blob urls inside card image blocks", async () => {
    const userId = "repair-user-c";
    const db = await getLocalDb(userId);

    await db.folders.put({
      id: "folder-c",
      folderId: "folder-c",
      folderName: "F2",
      userId,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown);

    await rawPutCard(db.name, {
      id: "card-c",
      userId,
      folderId: "folder-c",
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      questionBlocks: [
        {
          id: "q-img-1",
          type: "image",
          orderIndex: 0,
          images: [
            {
              id: "img-1",
              localUrl: "blob:http://localhost/bad",
              remoteUrl: null,
              status: "ready",
            },
          ],
        },
      ],
      answerBlocks: [],
    } as unknown);

    const result = await db.repairDataIntegrity(userId);
    const repaired = await db.cards.get("card-c");
    const repairedImage = repaired?.questionBlocks?.[0]?.images?.[0];

    expect(result.issues.some((i) => i.code === "MISSING_REQUIRED_FIELD")).toBe(
      true,
    );
    expect(repairedImage?.localUrl).toBeNull();
    expect(repairedImage?.status).toBe("failed");
  });

  it("repairs blob urls in snake_case blocks and legacy image arrays", async () => {
    const userId = "repair-user-e";
    const db = await getLocalDb(userId);

    await rawPutCard(db.name, {
      id: "card-e",
      userId,
      folderId: "folder-e",
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      question_blocks: [
        {
          id: "q-img-snake",
          type: "media",
          orderIndex: 0,
          src: "blob:http://localhost/snake-src",
          images: [
            {
              id: "img-snake",
              local_url: "blob:http://localhost/snake",
              remote_url: null,
              status: "ready",
            },
          ],
        },
      ],
      question_images: [
        {
          id: "legacy-q",
          localUrl: "blob:http://localhost/legacy-q",
          remoteUrl: null,
          status: "ready",
        },
      ],
      answer_images: [
        {
          id: "legacy-a",
          localUrl: "blob:http://localhost/legacy-a",
          remoteUrl: null,
          status: "ready",
        },
      ],
    } as unknown);

    const result = await db.repairDataIntegrity(userId);
    const repaired = await db.cards.get("card-e");
    const repairedBlock = repaired?.questionBlocks?.[0];
    const repairedLegacyQ = repaired?.questionImages?.[0];
    const repairedLegacyA = repaired?.answerImages?.[0];

    expect(result.issues.some((i) => i.code === "MISSING_REQUIRED_FIELD")).toBe(
      true,
    );
    expect(repaired?.question_blocks).toBeUndefined();
    expect(repairedBlock?.src).toBeNull();
    expect(repairedBlock?.images?.[0]?.localUrl).toBeNull();
    expect(repairedLegacyQ?.url ?? null).toBeNull();
    expect(repairedLegacyQ?.status).toBe("failed");
    expect(repairedLegacyA?.url ?? null).toBeNull();
    expect(repairedLegacyA?.status).toBe("failed");
  });

  it("blocks card persistence when blob url is included in blocks", async () => {
    const userId = "repair-user-d";
    const db = await getLocalDb(userId);

    await expect(
      db.addItem("cards", {
        id: "card-d",
        userId,
        folderId: "folder-d",
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        questionBlocks: [
          {
            id: "q-img-2",
            type: "image",
            orderIndex: 0,
            images: [
              {
                id: "img-2",
                localUrl: "blob:http://localhost/wrong",
                remoteUrl: null,
                status: "uploading",
              },
            ],
          },
        ],
        answerBlocks: [],
      } as unknown),
    ).rejects.toThrow(/画像の保存形式が不正|InvalidImageUrlError/);
  });

  it("includes blob field path in error details when blocking persistence", async () => {
    const userId = "repair-user-h";
    const db = await getLocalDb(userId);

    await expect(
      db.addItem("cards", {
        id: "card-h",
        userId,
        folderId: "folder-h",
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        questionBlocks: [
          {
            id: "q-img-h",
            type: "image",
            orderIndex: 0,
            images: [{ id: "img-h", localUrl: "blob:http://localhost/h" }],
          },
        ],
      } as unknown),
    ).rejects.toThrow(/path=.*questionBlocks\[0\]\.images\[0\]\.localUrl/);
  });

  it("blocks card update when blob url is included in legacy image fields", async () => {
    const userId = "repair-user-f";
    const db = await getLocalDb(userId);

    await db.cards.put({
      id: "card-f",
      userId,
      folderId: "folder-f",
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      questionBlocks: [],
      answerBlocks: [],
    } as unknown);

    await expect(
      db.updateItem("cards", "card-f", {
        question_images: [
          {
            id: "img-f",
            localUrl: "blob:http://localhost/legacy-update",
            remoteUrl: null,
            status: "uploading",
          },
        ],
      } as unknown),
    ).rejects.toThrow("画像の保存形式が不正");
  });

  it("blocks direct cards.put writes that include blob urls", async () => {
    const userId = "repair-user-g";
    const db = await getLocalDb(userId);

    await expect(
      db.cards.put({
        id: "card-g",
        userId,
        folderId: "folder-g",
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        questionBlocks: [
          {
            id: "q-media-1",
            type: "media",
            orderIndex: 0,
            images: [
              {
                id: "img-g",
                localUrl: "blob:http://localhost/direct-put",
                remoteUrl: null,
                status: "uploading",
              },
            ],
          },
        ],
      } as unknown),
    ).rejects.toThrow("画像の保存形式が不正");
  });
});



