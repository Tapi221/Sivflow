import { deleteDoc, doc } from "firebase/firestore";

import { firestoreDb } from "@/services/firebase";
import { cardDocPathSegments } from "@/services/firestorePaths";
import { getLocalDb } from "@/services/localDB";
import type {
  IntegrityIssue,
  IntegrityReport,
} from "@/services/dataIntegrityTypes";
import { sanitizeForLog } from "@/utils/logSanitizer";

export interface HardDeleteOrphanedCardsResult {
  targetCardIds: string[];
  deletedCardIds: string[];
  failedCardIds: string[];
  skippedCardIds: string[];
  deletedRemoteCardIds: string[];
  localCleanupTotals: {
    syncQueue: number;
    conflicts: number;
    studyLogs: number;
    levelHistories: number;
    cardRelations: number;
    syncErrors: number;
  };
}

type LocalCleanupTotals = HardDeleteOrphanedCardsResult["localCleanupTotals"];

type CardRelationRecord = {
  fromCardId?: unknown;
  toCardId?: unknown;
};

const isInvalidFolderRefCardIssue = (
  issue: IntegrityIssue,
): issue is IntegrityIssue & {
  code: "INVALID_FOLDER_REF";
  entityType: "card";
} => {
  return issue.code === "INVALID_FOLDER_REF" && issue.entityType === "card";
};

const dedupe = <T>(values: readonly T[]): T[] => {
  return Array.from(new Set(values));
};

const createEmptyTotals = (): LocalCleanupTotals => ({
  syncQueue: 0,
  conflicts: 0,
  studyLogs: 0,
  levelHistories: 0,
  cardRelations: 0,
  syncErrors: 0,
});

const mergeTotals = (
  left: LocalCleanupTotals,
  right: LocalCleanupTotals,
): LocalCleanupTotals => ({
  syncQueue: left.syncQueue + right.syncQueue,
  conflicts: left.conflicts + right.conflicts,
  studyLogs: left.studyLogs + right.studyLogs,
  levelHistories: left.levelHistories + right.levelHistories,
  cardRelations: left.cardRelations + right.cardRelations,
  syncErrors: left.syncErrors + right.syncErrors,
});

const deleteRemoteCard = async (
  userId: string,
  cardId: string,
): Promise<void> => {
  if (!firestoreDb) {
    throw new Error("[Integrity] Firestore is unavailable.");
  }

  const cardRef = doc(firestoreDb, ...cardDocPathSegments(userId, cardId));
  await deleteDoc(cardRef);
};

const cleanupLocalCardReferences = async (
  userId: string,
  cardId: string,
): Promise<LocalCleanupTotals> => {
  const db = await getLocalDb(userId);
  const syncErrors = await db.findQueueProcessingErrorsByTargetId(cardId);
  const syncErrorIds = dedupe(
    syncErrors
      .map((error) => error.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  return await db.transaction(
    "rw",
    [
      db.cards,
      db.syncQueue,
      db.conflicts,
      db.levelHistories,
      db.cardRelations,
      db.syncErrors,
      db.table("studyLogs"),
    ],
    async () => {
      const deletedSyncQueue = await db.syncQueue
        .where("targetId")
        .equals(cardId)
        .delete();

      const deletedConflicts = await db.conflicts
        .where("entityId")
        .equals(cardId)
        .delete();

      const deletedStudyLogs = await db
        .table("studyLogs")
        .where("cardId")
        .equals(cardId)
        .delete();

      const deletedLevelHistories = await db.levelHistories
        .where("cardId")
        .equals(cardId)
        .delete();

      const deletedCardRelations = await db.cardRelations
        .toCollection()
        .filter((record) => {
          const relation = record as CardRelationRecord;
          return relation.fromCardId === cardId || relation.toCardId === cardId;
        })
        .delete();

      if (syncErrorIds.length > 0) {
        await db.syncErrors.bulkDelete(syncErrorIds);
      }

      await db.purge("cards", cardId);

      return {
        syncQueue: deletedSyncQueue,
        conflicts: deletedConflicts,
        studyLogs: deletedStudyLogs,
        levelHistories: deletedLevelHistories,
        cardRelations: deletedCardRelations,
        syncErrors: syncErrorIds.length,
      };
    },
  );
};

export const createHardDeleteOrphanedCardsUseCase = () => {
  const execute = async (
    userId: string,
    report: IntegrityReport,
  ): Promise<HardDeleteOrphanedCardsResult> => {
    const targetCardIds = dedupe(
      report.issues
        .filter(isInvalidFolderRefCardIssue)
        .map((issue) => issue.entityId)
        .filter((cardId) => cardId.trim().length > 0),
    );

    if (targetCardIds.length === 0) {
      return {
        targetCardIds: [],
        deletedCardIds: [],
        failedCardIds: [],
        skippedCardIds: [],
        deletedRemoteCardIds: [],
        localCleanupTotals: createEmptyTotals(),
      };
    }

    const deletedCardIds: string[] = [];
    const failedCardIds: string[] = [];
    const skippedCardIds: string[] = [];
    const deletedRemoteCardIds: string[] = [];
    let localCleanupTotals = createEmptyTotals();

    for (const cardId of targetCardIds) {
      try {
        const db = await getLocalDb(userId);
        const currentCard = await db.cards.get(cardId);

        if (!currentCard) {
          skippedCardIds.push(cardId);
          continue;
        }

        await deleteRemoteCard(userId, cardId);
        deletedRemoteCardIds.push(cardId);

        const cleanupTotals = await cleanupLocalCardReferences(userId, cardId);
        localCleanupTotals = mergeTotals(localCleanupTotals, cleanupTotals);
        deletedCardIds.push(cardId);
      } catch (error) {
        failedCardIds.push(cardId);
        console.error(
          "[Integrity] hard delete orphaned card failed",
          sanitizeForLog({ userId, cardId, error }),
        );
      }
    }

    return {
      targetCardIds,
      deletedCardIds,
      failedCardIds,
      skippedCardIds,
      deletedRemoteCardIds,
      localCleanupTotals,
    };
  };

  return {
    execute,
  };
};
