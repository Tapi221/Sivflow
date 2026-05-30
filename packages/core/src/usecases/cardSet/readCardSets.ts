export type CardSetQueryEntity = {
  id: string;
  folderId: string | null;
  isDeleted?: boolean;
  is_deleted?: boolean;
  orderIndex?: number;
  updatedAt?: unknown;
  createdAt?: unknown;
  name?: string | null;
};

export type CardSetQueryRepository<TCardSet extends CardSetQueryEntity = CardSetQueryEntity> = {
  listCardSets: (userId: string) => Promise<TCardSet[]>;
};

const isDeletedEntity = (entity: { isDeleted?: boolean; is_deleted?: boolean }) => {
  return Boolean(entity.isDeleted ?? entity.is_deleted);
};

const toMillis = (value: unknown): number => {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.getTime();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.abs(value) < 1e12 ? value * 1000 : value;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed.getTime() : 0;
  }

  if (!value || typeof value !== "object") {
    return 0;
  }

  const timestamp = value as { toMillis?: () => unknown; toDate?: () => unknown; seconds?: unknown; _seconds?: unknown; nanoseconds?: unknown; _nanoseconds?: unknown };

  if (typeof timestamp.toMillis === "function") {
    const millis = timestamp.toMillis();
    if (typeof millis === "number" && Number.isFinite(millis)) return millis;
  }

  if (typeof timestamp.toDate === "function") {
    const date = timestamp.toDate();
    if (date instanceof Date && Number.isFinite(date.getTime())) return date.getTime();
  }

  const seconds = timestamp.seconds ?? timestamp._seconds;
  const nanoseconds = timestamp.nanoseconds ?? timestamp._nanoseconds ?? 0;

  if (typeof seconds === "number" && Number.isFinite(seconds)) {
    return seconds * 1000 + (typeof nanoseconds === "number" && Number.isFinite(nanoseconds) ? Math.floor(nanoseconds / 1_000_000) : 0);
  }

  return 0;
};

const compareCardSets = <TCardSet extends CardSetQueryEntity>(left: TCardSet, right: TCardSet) => {
  const orderCompare = (left.orderIndex ?? 0) - (right.orderIndex ?? 0);
  if (orderCompare !== 0) return orderCompare;

  const updatedCompare = toMillis(right.updatedAt) - toMillis(left.updatedAt);
  if (updatedCompare !== 0) return updatedCompare;

  const createdCompare = toMillis(right.createdAt) - toMillis(left.createdAt);
  if (createdCompare !== 0) return createdCompare;

  const nameCompare = (left.name ?? "").localeCompare(right.name ?? "", "ja");
  if (nameCompare !== 0) return nameCompare;

  return left.id.localeCompare(right.id, "ja");
};

export const listCardSetsForFolder = async <TCardSet extends CardSetQueryEntity>({
  userId,
  folderId,
  repository,
}: {
  userId: string;
  folderId?: string | null;
  repository: CardSetQueryRepository<TCardSet>;
}): Promise<TCardSet[]> => {
  const cardSets = await repository.listCardSets(userId);
  const activeCardSets = cardSets.filter((cardSet) => !isDeletedEntity(cardSet));
  const filteredCardSets = folderId === undefined ? activeCardSets : activeCardSets.filter((cardSet) => cardSet.folderId === (folderId ?? null));

  return filteredCardSets.sort(compareCardSets);
};
