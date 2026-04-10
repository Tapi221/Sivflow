import { createCheckDataIntegrityUseCase } from "@/application/integrity/CheckDataIntegrity";
import { createQuarantineOrphanedCardsUseCase } from "@/application/integrity/QuarantineOrphanedCards";

const checkDataIntegrityUseCase = createCheckDataIntegrityUseCase();
const quarantineOrphanedCardsUseCase = createQuarantineOrphanedCardsUseCase();

export const dataIntegrityService = {
  checkIntegrity: async () => {
    return await checkDataIntegrityUseCase.execute();
  },
  quarantineOrphanedCards: async () => {
    return await quarantineOrphanedCardsUseCase.execute();
  },
};
