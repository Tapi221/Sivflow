import { createCheckDataIntegrityUseCase } from "./CheckDataIntegrity";
import { getLocalDb } from "@/infrastructure/persistence/indexeddb";
import { sanitizeForLog } from "@/utils/logSanitizer";



const createQuarantineOrphanedCardsUseCase = () => {
  const checkDataIntegrityUseCase = createCheckDataIntegrityUseCase();

  const execute = async (): Promise<number> => {
    const report = await checkDataIntegrityUseCase.execute();
    const orphanedCardIds = report.issues
      .filter(
        (issue) =>
          issue.code === "INVALID_FOLDER_REF" && issue.entityType === "card",
      )
      .map((issue) => issue.entityId);

    let count = 0;
    const db = await getLocalDb();

    for (const cardId of orphanedCardIds) {
      try {
        await db.softDelete("cards", cardId);
        count += 1;
      } catch (error) {
        console.error(
          "[Integrity] quarantine failed",
          sanitizeForLog({ cardId, error }),
        );
      }
    }

    return count;
  };

  return {
    execute,
  };
};



export { createQuarantineOrphanedCardsUseCase };
