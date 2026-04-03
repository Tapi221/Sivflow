import { getLocalDb } from "./localDB";
import { normalizeCard, normalizeFolder } from "@/utils";
import type { IntegrityIssue, IntegrityReport } from "./dataIntegrityTypes";
import { sanitizeForLog } from "@/utils/logSanitizer";
import { getCardBlocks, getCardText } from "@/domain/card/content";

const TIMESTAMP_KEYS = [
  "createdAt",
  "updatedAt",
  "deletedAt",
  "nextReviewDate",
  "lastReviewAt",
] as const;

const isMissingFolderId = (folderId: unknown): boolean =>
  folderId === null || folderId === undefined || String(folderId).trim() === "";

const readDeletedState = (entity: unknown): boolean =>
  Boolean(entity?.isDeleted ?? entity?.is_deleted ?? entity?.deleted);

const normalizeTimestampValue = (value: unknown): Date | null => {
  if (value == null || value === "") return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (
    typeof value === "object" &&
    typeof (value as unknown).toDate === "function"
  ) {
    try {
      const dt = (value as unknown).toDate();
      return dt instanceof Date && !Number.isNaN(dt.getTime()) ? dt : null;
    } catch {
      return null;
    }
  }
  return null;
};

class DataIntegrityService {
  async checkIntegrity(): Promise<IntegrityReport> {
    const issues: IntegrityIssue[] = [];

    try {
      const db = await getLocalDb();
      const allCards = await db.getAllCards();
      const allFolders = await db.getAllFolders();

      const cards = allCards.map(normalizeCard);
      const folders = allFolders.map(normalizeFolder);
      const folderIds = new Set(folders.map((f) => f.id));

      for (const card of cards as unknown[]) {
        const deletedAtExists = card.deletedAt != null;
        const isDeleted = readDeletedState(card);
        if (deletedAtExists !== isDeleted) {
          issues.push({
            code: "DELETED_FLAG_MISMATCH",
            entityType: "card",
            entityId: String(card.id ?? "unknown"),
            severity: "warning",
            fixed: false,
            details: { hasDeletedAt: deletedAtExists, isDeleted },
          });
        }

        for (const key of TIMESTAMP_KEYS) {
          const raw = card[key];
          if (raw == null) continue;
          const normalized = normalizeTimestampValue(raw);
          if (!normalized || !(raw instanceof Date)) {
            issues.push({
              code: "TIMESTAMP_TYPE_MIXED",
              entityType: "card",
              entityId: String(card.id ?? "unknown"),
              severity: normalized ? "info" : "warning",
              fixed: false,
              details: { field: key, originalType: typeof raw },
            });
          }
        }

        if (!isDeleted && isMissingFolderId(card.folderId)) {
          issues.push({
            code: "MISSING_FOLDER",
            entityType: "card",
            entityId: String(card.id ?? "unknown"),
            severity: "error",
            fixed: false,
            details: { folderId: card.folderId ?? null },
          });
        }

        if (
          !isDeleted &&
          !isMissingFolderId(card.folderId) &&
          !folderIds.has(String(card.folderId))
        ) {
          issues.push({
            code: "INVALID_FOLDER_REF",
            entityType: "card",
            entityId: String(card.id ?? "unknown"),
            severity: "error",
            fixed: false,
            details: { folderId: String(card.folderId) },
          });
        }

        const frontBlocks = getCardBlocks(card, "question");
        const backBlocks = getCardBlocks(card, "answer");
        const blocks = [...frontBlocks, ...backBlocks];
        if (blocks.some((b) => typeof b?.orderIndex !== "number")) {
          issues.push({
            code: "BLOCK_ORDER_INDEX_MISSING",
            entityType: "card",
            entityId: String(card.id ?? "unknown"),
            severity: "warning",
            fixed: false,
            details: { blockCount: blocks.length },
          });
        }

        void getCardText(card, "question");
        void getCardText(card, "answer");
      }

      for (const folder of folders as unknown[]) {
        if (!folder.folderName && !(folder as unknown).folder_name) {
          issues.push({
            code: "MISSING_REQUIRED_FIELD",
            entityType: "folder",
            entityId: String(folder.id ?? "unknown"),
            severity: "warning",
            fixed: false,
            details: { field: "folderName" },
          });
        }
      }

      return {
        checkedAt: new Date().toISOString(),
        totalCards: cards.filter((c) => !c.isDeleted).length,
        totalFolders: folders.filter((f) => !f.isDeleted).length,
        issues,
        isHealthy: issues.filter((i) => i.severity === "error").length === 0,
      };
    } catch (error) {
      console.error("[Integrity] check failed", sanitizeForLog(error));
      return {
        checkedAt: new Date().toISOString(),
        totalCards: 0,
        totalFolders: 0,
        issues: [
          {
            code: "SYSTEM_CHECK_FAILED",
            entityType: "system",
            entityId: "system",
            severity: "error",
            fixed: false,
            details: { error: String(error) },
          },
        ],
        isHealthy: false,
      };
    }
  }

  async quarantineOrphanedCards(): Promise<number> {
    const report = await this.checkIntegrity();
    const orphanedCardIds = report.issues
      .filter((i) => i.code === "INVALID_FOLDER_REF" && i.entityType === "card")
      .map((i) => i.entityId);

    let count = 0;
    const db = await getLocalDb();
    for (const cardId of orphanedCardIds) {
      try {
        await db.softDelete("cards", cardId);
        count++;
      } catch (e) {
        console.error(
          "[Integrity] quarantine failed",
          sanitizeForLog({ cardId, error: e }),
        );
      }
    }

    return count;
  }
}

export const dataIntegrityService = new DataIntegrityService();
