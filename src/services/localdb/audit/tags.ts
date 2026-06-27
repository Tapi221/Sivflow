import { getInstance } from "@/services/localdb/instanceManager";



type CardTagFields = {
  tagIds?: unknown;
  updatedAt?: Date;
};
type TagRepairSummary = {
  removedOrphanTagRefs: number;
  dedupedTagRefs: number;
  duplicateNameLowerPairs: Array<{
    userId: string;
    nameLower: string;
    tagIds: string[];
  }>;
};
type TransactionalLocalDb = Awaited<ReturnType<typeof getInstance>> & {
  transaction: <T>(mode: string, ...args: unknown[]) => Promise<T>;
};



const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
};
const auditAndRepairTags = async (userId: string): Promise<TagRepairSummary> => {
  const db = await getInstance(userId);
  const transactionalDb = db as TransactionalLocalDb;
  const tagIdsByNameLower = new Map<string, string[]>();
  const knownTagIds = new Set<string>();
  let removedOrphanTagRefs = 0;
  let dedupedTagRefs = 0;

  await transactionalDb.transaction("rw", transactionalDb.tagRecords, transactionalDb.cards, async () => {
    await transactionalDb.tagRecords
      .where("userId")
      .equals(userId)
      .each((raw: unknown) => {
        const tag = raw as {
          id?: unknown;
          userId?: unknown;
          nameLower?: unknown;
          isDeleted?: unknown;
        };

        if (
          typeof tag.id !== "string" ||
          typeof tag.userId !== "string" ||
          typeof tag.nameLower !== "string"
        ) {
          return;
        }

        if (tag.isDeleted === true) {
          return;
        }

        knownTagIds.add(tag.id);

        const key = `${tag.userId}__${tag.nameLower}`;
        const existing = tagIdsByNameLower.get(key);
        if (existing) existing.push(tag.id);
        else tagIdsByNameLower.set(key, [tag.id]);
      });

    await transactionalDb.cards
      .where("userId")
      .equals(userId)
      .modify((raw: unknown) => {
        const card = raw as Record<string, unknown> & CardTagFields;
        const currentTagIds = asStringArray(card.tagIds);
        if (currentTagIds.length === 0) return;

        const seen = new Set<string>();
        const nextTagIds: string[] = [];
        let changed = false;

        for (const tagId of currentTagIds) {
          if (!knownTagIds.has(tagId)) {
            removedOrphanTagRefs += 1;
            changed = true;
            continue;
          }

          if (seen.has(tagId)) {
            dedupedTagRefs += 1;
            changed = true;
            continue;
          }

          seen.add(tagId);
          nextTagIds.push(tagId);
        }

        if (!changed) return;

        card.tagIds = nextTagIds;
        card.updatedAt = new Date();
      });
  });

  const duplicateNameLowerPairs: Array<{
    userId: string;
    nameLower: string;
    tagIds: string[];
  }> = [];

  for (const [key, tagIds] of tagIdsByNameLower.entries()) {
    if (tagIds.length < 2) continue;
    const separatorIndex = key.indexOf("__");
    duplicateNameLowerPairs.push({
      userId: key.slice(0, separatorIndex),
      nameLower: key.slice(separatorIndex + 2),
      tagIds,
    });
  }

  return { removedOrphanTagRefs, dedupedTagRefs, duplicateNameLowerPairs };
};



export { auditAndRepairTags };


export type { TagRepairSummary };
