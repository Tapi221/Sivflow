import type { SnapshotRepositoryPort } from "@/application/ports/SnapshotRepositoryPort";
import type { AppSnapshot } from "@/types/domain/snapshot";



const createSnapshotStoreUseCase = ({ repository }: { repository: SnapshotRepositoryPort;
}) => {
  const save = async (snapshot: AppSnapshot): Promise<void> => {
    await repository.save(snapshot);
  };

  const list = async (userId: string): Promise<AppSnapshot[]> => {
    return await repository.list(userId);
  };

  return {
    save,
    list,
  };
};



export { createSnapshotStoreUseCase };
