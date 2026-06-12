import * as ChangeParsing from "./cloudSyncChangeParsing";
import * as EntityMetadata from "./cloudSyncEntityMetadata";
import * as Sanitizers from "./cloudSyncSanitizers";
import * as Timestamps from "./cloudSyncTimestamps";



type CloudEntityType = EntityMetadata.CloudEntityType;
type PullableEntityType = EntityMetadata.PullableEntityType;



const getChangeId = ChangeParsing.getChangeId;
const getChangeParts = ChangeParsing.getChangeParts;
const COLLECTION_BY_TYPE = EntityMetadata.COLLECTION_BY_TYPE;
const CURRENT_TAG_COLLECTION = EntityMetadata.CURRENT_TAG_COLLECTION;
const isCloudEntityType = EntityMetadata.isCloudEntityType;
const PULLABLE_ENTITY_TYPES = EntityMetadata.PULLABLE_ENTITY_TYPES;
const deepStripUndefined = Sanitizers.deepStripUndefined;
const sanitizeSyncDataForCloud = Sanitizers.sanitizeSyncDataForCloud;
const sanitizeSyncDataFromCloud = Sanitizers.sanitizeSyncDataFromCloud;
const getUpdatedAtMillis = Timestamps.getUpdatedAtMillis;



export { COLLECTION_BY_TYPE, CURRENT_TAG_COLLECTION, PULLABLE_ENTITY_TYPES, deepStripUndefined, getChangeId, getChangeParts, getUpdatedAtMillis, isCloudEntityType, sanitizeSyncDataForCloud, sanitizeSyncDataFromCloud };


export type { CloudEntityType, PullableEntityType };
