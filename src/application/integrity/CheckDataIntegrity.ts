import { getCardBlocks, getCardText } from "@/domain/card/content";
import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import { normalizeFolder } from "@/domain/folder/normalizers/normalizeFolder";
import { getLocalDb } from "@/infrastructure/persistence/indexeddb";
import type { IntegrityIssue, IntegrityReport } from "@/services/dataIntegrityTypes";
import { sanitizeForLog } from "@/utils/logSanitizer";

const TIMESTAMP_KEYS = [
  "createdAt",
  "updatedAt",
  "deletedAt",
  "nextReviewDate",
  "lastReviewAt",
] as const;

const isMissingFolderId = (folderId: unknown): boolean => {
  return folderId === null || folderId === undefined || String(folderId).trim() === "";
};

const readDeletedState = (entity: Record<string, unknown>): boolean => {
  return Boolean(entity.isDeleted ?? entity.is_deleted ?? entity.deleted);
};

const normalizeTimestampValue = (value: unknown): Date | null => {
  if (value == null || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    try {
      const dt = (value as { toDate: () => unknown }).toDate();
      return dt instanceof Date && !Number.isNaN(dt.getTime()) ? dt : null;
    } catch {
      return null;
    }
  }

  return null;
};

export const createCheckDataIntegrityUseCase = () => {
  const execute = async (): Promise<IntegrityReport> => {
    const issues: IntegrityIssue[] = [];

    try {
      const db = await getLocalDb();
      const allCards = await db.getAllCards();
      const allFolders = await db.getAllFolders();

      const cards = allCards.map(normalizeCard);
      const folders = allFolders.map(normalizeFolder);
      const folderIds = new Set(folders.map((folder) => folder.id));

      for (const card of cards as unknown[]) {
        const candidate = card as Record<string, unknown>;
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

          const normalized = normalizeTimestampValue(raw);

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

        if (blocks.some((block) => typeof block?.orderIndex !== "number")) {
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

      for (const folder of folders as unknown[]) {
        const candidate = folder as Record<string, unknown>;

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
        isHealthy: issues.filter((issue) => issue.severity === "error").length === 0,
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
