type CloudEntityType = | "card" | "folder" | "cardSet" | "document" | "tag" | "asset" | "projectMap" | "userSetting";
type PullableEntityType = Exclude<CloudEntityType, "userSetting">;



const CURRENT_TAG_COLLECTION = "tags" as const;
const COLLECTION_BY_TYPE: Record<CloudEntityType, string> = { card: "cards", folder: "folders", cardSet: "cardSets", document: "documents", tag: CURRENT_TAG_COLLECTION, asset: "images", projectMap: "projectMaps", userSetting: "userSettings" };
const PULLABLE_ENTITY_TYPES: readonly PullableEntityType[] = ["card", "folder", "cardSet", "document", "tag", "asset", "projectMap"];



const isCloudEntityType = (value: unknown): value is CloudEntityType => typeof value === "string" && value in COLLECTION_BY_TYPE;



export { CURRENT_TAG_COLLECTION, COLLECTION_BY_TYPE, PULLABLE_ENTITY_TYPES, isCloudEntityType };


export type { CloudEntityType, PullableEntityType };
