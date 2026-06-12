type PinnedItemType = "folder" | "card" | "document";
interface PinnedItem {
  type: PinnedItemType;
  id: string;
}

export type { PinnedItemType, PinnedItem };
