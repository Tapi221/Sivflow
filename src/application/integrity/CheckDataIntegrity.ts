import { getCardBlocks, getCardText } from "@/domain/card/content";
import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import { normalizeFolder } from "@/domain/folder/normalizers/normalizeFolder";

import { getLocalDb } from "@/infrastructure/persistence/indexeddb";
import type {
  IntegrityIssue,
  IntegrityReport,
} from "@/services/dataIntegrityTypes";
import { normalizeDate } from "@/shared/codec/date";
import type { Card } from "@/types/domain/card";
import type { Folder } from "@/types/domain/folder";
import { sanitizeForLog } from "@/utils/logSanitizer";

const TIMESTAMP_KEYS = [
  "createdAt",
  "updatedAt",
  "deletedAt",
  "nextReviewDate",
  "lastReviewAt",
] as const;

const isMissingFolderId = (folderId: unknown): boolean => {
  return (
    folderId === null ||
    folderId === undefined ||
    String(folderId).trim() === ""
  );
};

const readDeletedState = (entity: Record<string, unknown>): boolean => {
  return Boolean(entity.isDeleted ?? entity.is_deleted ?? entity.deleted);
};

const toRecord = (value: unknown): Record<string, unknown> => {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
};

export const createCheckDataIntegrityUseCase = () => {
  const execute = async (): Promise<IntegrityReport> => {
    const issues: IntegrityIssue[] = [];

    try {
      const db = await getLocalDb();

      const [allCards, allFolders] = await Promise.all([
        db.getAllItems("cards"),
        db.getAllItems("folders"),
      ]);

      const cards: Card[] = allCards.map((card) => normalizeCard(card));
      const folders: Folder[] = allFolders.map((folder) =>
        normalizeFolder(folder),
      );

      const folderIds = new Set(folders.map((folder) => folder.id));

      for (const card of cards) {
        const candidate = toRecord(card);
        const deletedAtExists = candidate.deletedAt != null;
        const isDeleted = readDeletedState(candidate);

        if (deletedAtExists !== isDeleted) {
          issues.push({
            code: "DELETED_FLAG_MISMATCH",
            entityType: "card",
            entityId: String(candidate.id ?? "unknown"),
            severity: "warning",
            fixed: false,
            details: { hasDeletedAt: deletedAtExists, isDeleted },
          });
        }

        for (const key of TIMESTAMP_KEYS) {
          const raw = candidate[key];
          if (raw == null) {
            continue;
          }

          const normalized = normalizeDate(raw);

          if (!normalized || !(raw instanceof Date)) {
            issues.push({
              code: "TIMESTAMP_TYPE_MIXED",
              entityType: "card",
              entityId: String(candidate.id ?? "unknown"),
              severity: normalized ? "info" : "warning",
              fixed: false,
              details: { field: key, originalType: typeof raw },
            });
          }
        }

        if (!isDeleted && isMissingFolderId(candidate.folderId)) {
          issues.push({
            code: "MISSING_FOLDER",
            entityType: "card",
            entityId: String(candidate.id ?? "unknown"),
            severity: "error",
            fixed: false,
            details: { folderId: candidate.folderId ?? null },
          });
        }

        if (
          !isDeleted &&
          !isMissingFolderId(candidate.folderId) &&
          !folderIds.has(String(candidate.folderId))
        ) {
          issues.push({
            code: "INVALID_FOLDER_REF",
            entityType: "card",
            entityId: String(candidate.id ?? "unknown"),
            severity: "error",
            fixed: false,
            details: { folderId: String(candidate.folderId) },
          });
        }

        const frontBlocks = getCardBlocks(card, "question");
        const backBlocks = getCardBlocks(card, "answer");
        const blocks = [...frontBlocks, ...backBlocks];

        if (blocks.some((block) => typeof block.orderIndex !== "number")) {
          issues.push({
            code: "BLOCK_ORDER_INDEX_MISSING",
            entityType: "card",
            entityId: String(candidate.id ?? "unknown"),
            severity: "warning",
            fixed: false,
            details: { blockCount: blocks.length },
          });
        }

        void getCardText(card, "question");
        void getCardText(card, "answer");
      }

      for (const folder of folders) {
        const candidate = toRecord(folder);

        if (!candidate.folderName && !candidate.folder_name) {
          issues.push({
            code: "MISSING_REQUIRED_FIELD",
            entityType: "folder",
            entityId: String(candidate.id ?? "unknown"),
            severity: "warning",
            fixed: false,
            details: { field: "folderName" },
          });
        }
      }

      return {
        checkedAt: new Date().toISOString(),
        totalCards: cards.filter((card) => !card.isDeleted).length,
        totalFolders: folders.filter((folder) => !folder.isDeleted).length,
        issues,
        isHealthy:
          issues.filter((issue) => issue.severity === "error").length === 0,
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
  };

  return {
    execute,
  };
};
