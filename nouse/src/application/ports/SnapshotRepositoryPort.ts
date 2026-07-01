import type { AppSnapshot } from "@/types/domain/snapshot";



interface SnapshotRepositoryPort {
  save: (snapshot: AppSnapshot) => Promise<void>;
  list: (userId: string) => Promise<AppSnapshot[]>;
}

export type { SnapshotRepositoryPort };
