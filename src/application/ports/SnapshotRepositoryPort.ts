import type { AppSnapshot } from "@/types/domain/snapshot";

export interface SnapshotRepositoryPort {
  save: (snapshot: AppSnapshot) => Promise<void>;
  list: (userId: string) => Promise<AppSnapshot[]>;
}
