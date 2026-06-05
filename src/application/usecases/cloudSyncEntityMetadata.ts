export type CloudEntityType =
  | "card"
  | "folder"
  | "cardSet"
  | "document"
  | "tag"
  | "asset"
  | "projectMap"
  | "userSetting";

export type PullableEntityType = Exclude<CloudEntityType, "userSetting">;

export const CURRENT_TAG_COLLECTION = "tags" as const;

export const COLLECTION_BY_TYPE: Record<CloudEntityType, string> = {
  card: "cards",
  folder: "folders",
  cardSet: "cardSets",
  document: "documents",
  tag: CURRENT_TAG_COLLECTION,
  asset: "images",
  projectMap: "projectMaps",
  userSetting: "userSettings",
};

export const PULLABLE_ENTITY_TYPES: readonly PullableEntityType[] = ["card", "folder", "cardSet", "document", "tag", "asset", "projectMap"];

export const isCloudEntityType = (value: unknown): value is CloudEntityType => typeof value === "string" && value in COLLECTION_BY_TYPE;