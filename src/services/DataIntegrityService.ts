import { createCheckDataIntegrityUseCase } from "@/application/integrity/CheckDataIntegrity";
import { createHardDeleteOrphanedCardsUseCase } from "@/application/integrity/HardDeleteOrphanedCards";
import { createQuarantineOrphanedCardsUseCase } from "@/application/integrity/QuarantineOrphanedCards";
import type { IntegrityReport } from "@/services/dataIntegrityTypes";

const checkDataIntegrityUseCase = createCheckDataIntegrityUseCase();
const quarantineOrphanedCardsUseCase = createQuarantineOrphanedCardsUseCase();
const hardDeleteOrphanedCardsUseCase = createHardDeleteOrphanedCardsUseCase();

export const dataIntegrityService = {
  checkIntegrity: async () => {
    return await checkDataIntegrityUseCase.execute();
  },
  quarantineOrphanedCards: async () => {
    return await quarantineOrphanedCardsUseCase.execute();
  },
  hardDeleteOrphanedCards: async (userId: string, report: IntegrityReport) => {
    return await hardDeleteOrphanedCardsUseCase.execute(userId, report);
  },
};
