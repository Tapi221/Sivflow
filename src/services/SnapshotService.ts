/**
 * SnapshotService
 *
 * 設計原則：
 * - ローカルが正本、サーバーはバックアップ
 * - 自動マージ禁止
 * - 正本判定は generationCounter のみ
 * - エクスポートは人間に優しく、内部は厳密
 */

import { getLocalDb, getLocalDBRuntimeStatus } from "./localDB";
import { firestoreDb } from "./firebase";
import {
  collection,
  addDoc,
  query,  orderBy,
  limit,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import type {
  AppSnapshot,
  SnapshotMetadata,
  SnapshotData,
  SnapshotComparison,
} from "@/types/domain/snapshot";
import { CURRENT_SCHEMA_VERSION, APP_VERSION } from "@/types/domain/snapshot";
import { normalizeCard, normalizeFolder } from "@/utils";

/** ローカルストレージのキー */
const GENERATION_COUNTER_KEY = "flashcard_generation_counter";
const SNAPSHOTS_KEY = "flashcard_snapshots";
const MAX_STORED_SNAPSHOTS = 7; // 最大7世代保持

class SnapshotService {
  private assertPersistentStorageAvailable(operation: string): void {
    const status = getLocalDBRuntimeStatus();
    if (status.mode === "fallback") {
      throw new Error(
        `[Snapshot] ${operation} is unavailable in fallback mode. Local persistent storage is disabled for this session.`,
      );
    }
  }

  /**
   * 現在の世代カウンターを取得（単調増加）
   */
  private getGenerationCounter(): number {
    const stored = localStorage.getItem(GENERATION_COUNTER_KEY);
    const parsed = stored ? parseInt(stored, 10) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /**
   * 世代カウンターをインクリメント
   */
  private incrementGenerationCounter(): number {
    const current = this.getGenerationCounter();
    const next = current + 1;
    localStorage.setItem(GENERATION_COUNTER_KEY, next.toString());
    return next;
  }

  /**
   * 現在のデータから完全なスナップショットを作成
   */
  async createSnapshot(
    userId: string,
    options: { bumpGenerationCounter?: boolean } = {},
  ): Promise<AppSnapshot> {
    this.assertPersistentStorageAvailable("createSnapshot");
    const db = await getLocalDb(userId);

    // 全データを取得（差分ではなく完全コピー）
    const allCards = await db.getAllCards();
    const allFolders = await db.getAllFolders();

    // 正規化
    const cards = allCards.map(normalizeCard);
    const folders = allFolders.map(normalizeFolder);

    // 学習ログは現時点では空（将来拡張用）
    const reviews: unknown[] = [];

    // 設定も現時点では空（将来拡張用）
    const settings = null;

    const bump = options.bumpGenerationCounter !== false;

    const metadata: SnapshotMetadata = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      generationCounter: bump
        ? this.incrementGenerationCounter()
        : this.getGenerationCounter(),
      createdAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      userId,
    };

    const data: SnapshotData = {
      cards,
      folders,
      reviews,
      settings,
    };

    return { metadata, data };
  }

  /**
   * スナップショットをJSONファイルとしてエクスポート
   * ファイル名は人間に優しく、内部データは厳密
   */
  async exportToFile(userId: string, folderName?: string): Promise<void> {
    this.assertPersistentStorageAvailable("exportToFile");
    const snapshot = await this.createSnapshot(userId);

    // ファイル名は補助情報（名前が変わっても壊れない）
    const date = new Date().toISOString().split("T")[0];
    const gen = snapshot.metadata.generationCounter;
    const folderPart = folderName ? `_${folderName}` : "";
    const filename = `flashcard${folderPart}_${date}_gen${gen}.json`;

    // JSON出力（圧縮なし、可読性優先）
    const json = JSON.stringify(snapshot, null, 2);

    // ダウンロード
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 特定フォルダのみをエクスポート
   */
  async exportFolder(userId: string, folderId: string): Promise<void> {
    this.assertPersistentStorageAvailable("exportFolder");
    const fullSnapshot = await this.createSnapshot(userId);

    // 対象フォルダとそのカードのみ抽出
    const folder = fullSnapshot.data.folders.find((f) => f.id === folderId);
    if (!folder) {
      throw new Error("Folder not found");
    }

    const cards = fullSnapshot.data.cards.filter(
      (c) => c.folderId === folderId,
    );

    // 部分スナップショット
    const partialSnapshot: AppSnapshot = {
      metadata: fullSnapshot.metadata,
      data: {
        cards,
        folders: [folder],
        reviews: [],
        settings: null,
      },
    };

    const folderName =
      (folder as unknown).folderName || (folder as unknown).folder_name || "unknown";
    const date = new Date().toISOString().split("T")[0];
    const gen = partialSnapshot.metadata.generationCounter;
    const filename = `flashcard_${folderName}_${date}_gen${gen}.json`;

    const json = JSON.stringify(partialSnapshot, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * JSONファイルからスナップショットを読み込み（検証付き）
   */
  async parseSnapshotFile(file: File): Promise<AppSnapshot> {
    const text = await file.text();
    const parsed = JSON.parse(text);

    // 必須フィールドの検証
    if (!parsed.metadata || !parsed.data) {
      throw new Error("Invalid snapshot format: missing metadata or data");
    }

    if (typeof parsed.metadata.schemaVersion !== "number") {
      throw new Error("Invalid snapshot format: missing schemaVersion");
    }

    if (typeof parsed.metadata.generationCounter !== "number") {
      throw new Error("Invalid snapshot format: missing generationCounter");
    }

    // スキーマバージョンチェック
    if (parsed.metadata.schemaVersion > CURRENT_SCHEMA_VERSION) {
      throw new Error(
        `Unsupported schema version: ${parsed.metadata.schemaVersion}`,
      );
    }

    return parsed as AppSnapshot;
  }

  /**
   * スナップショットを比較（自動マージはしない、UIに判断を委ねる）
   */
  async compareWithLocal(
    imported: AppSnapshot,
    userId: string,
  ): Promise<SnapshotComparison> {
    this.assertPersistentStorageAvailable("compareWithLocal");

    // Compareは読み取り操作なので世代カウンターを進めない
    const local = await this.createSnapshot(userId, {
      bumpGenerationCounter: false,
    });

    const localGen = local.metadata.generationCounter;
    const importedGen = imported.metadata.generationCounter;

    // 正本判定は generationCounter のみ
    let newerSnapshot: "local" | "imported" | "same";
    if (localGen > importedGen) {
      newerSnapshot = "local";
    } else if (importedGen > localGen) {
      newerSnapshot = "imported";
    } else {
      newerSnapshot = "same";
    }

    // 差分計算（情報提供用、マージには使わない）
    const localCardIds = new Set(local.data.cards.map((c) => c.id));
    const importedCardIds = new Set(imported.data.cards.map((c) => c.id));

    const localFolderIds = new Set(local.data.folders.map((f) => f.id));
    const importedFolderIds = new Set(imported.data.folders.map((f) => f.id));

    const cardsAdded = [...importedCardIds].filter(
      (id) => !localCardIds.has(id),
    ).length;
    const cardsRemoved = [...localCardIds].filter(
      (id) => !importedCardIds.has(id),
    ).length;
    const cardsModified = 0; // 詳細比較は省略

    const foldersAdded = [...importedFolderIds].filter(
      (id) => !localFolderIds.has(id),
    ).length;
    const foldersRemoved = [...localFolderIds].filter(
      (id) => !importedFolderIds.has(id),
    ).length;

    return {
      newerSnapshot,
      localGeneration: localGen,
      importedGeneration: importedGen,
      diff: {
        cardsAdded,
        cardsRemoved,
        cardsModified,
        foldersAdded,
        foldersRemoved,
      },
    };
  }

  /**
   * Firestore にスナップショットを保存
   *
   * 🔥 設計変更: Snapshot は「正」である → クラウドに保存
   */
  async saveToFirestore(snapshot: AppSnapshot): Promise<void> {
    const userId = snapshot.metadata.userId;
    if (!userId) {
      throw new Error("userId is required for saving snapshot");
    }

    // Firestore に保存
    const snapshotsRef = collection(firestoreDb, `users/${userId}/snapshots`);
    await addDoc(snapshotsRef, {
      ...snapshot,
      createdAt: new Date(snapshot.metadata.createdAt),
    });

    // 古いスナップショットを削除（最大7世代保持）
    const q = query(
      snapshotsRef,
      orderBy("metadata.createdAt", "desc"),
      limit(100), // 安全のため多めに取得
    );

    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs;

    // 7世代より古いものを削除
    if (docs.length > MAX_STORED_SNAPSHOTS) {
      const toDelete = docs.slice(MAX_STORED_SNAPSHOTS);
      await Promise.all(toDelete.map((doc) => deleteDoc(doc.ref)));
      console.log(`[Snapshot] Deleted ${toDelete.length} old snapshots`);
    }
  }

  /**
   * Firestore から保存済みスナップショット一覧を取得
   */
  async getStoredSnapshots(userId: string): Promise<AppSnapshot[]> {
    const snapshotsRef = collection(firestoreDb, `users/${userId}/snapshots`);
    const q = query(snapshotsRef, orderBy("metadata.createdAt", "desc"));

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        metadata: data.metadata,
        data: data.data,
      } as AppSnapshot;
    });
  }

  /**
   * LocalStorage からの移行（互換性のため残す）
   *
   * @deprecated LocalStorage は使用しない。Firestore に移行済み。
   */
  private getStoredSnapshotsFromLocalStorage(): AppSnapshot[] {
    const storedJson = localStorage.getItem(SNAPSHOTS_KEY);
    return storedJson ? JSON.parse(storedJson) : [];
  }

  /**
   * LocalStorage のスナップショットを Firestore に移行
   */
  async migrateFromLocalStorage(userId: string): Promise<void> {
    const localSnapshots = this.getStoredSnapshotsFromLocalStorage();

    if (localSnapshots.length === 0) {
      console.log("[Snapshot] No local snapshots to migrate");
      return;
    }

    console.log(
      `[Snapshot] Migrating ${localSnapshots.length} snapshots to Firestore...`,
    );

    for (const snapshot of localSnapshots) {
      // userId を追加
      snapshot.metadata.userId = userId;
      await this.saveToFirestore(snapshot);
    }

    // 移行完了後、LocalStorage から削除
    localStorage.removeItem(SNAPSHOTS_KEY);
    console.log("[Snapshot] Migration complete, LocalStorage cleared");
  }
}

export const snapshotService = new SnapshotService();

