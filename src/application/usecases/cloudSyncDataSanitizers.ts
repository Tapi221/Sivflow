import { sanitizeSyncDataFromCloud as readCloudSyncData } from "@/application/usecases/cloudSyncFromCloudSanitizer";
import { sanitizeSyncDataForCloud as writeCloudSyncData } from "@/application/usecases/cloudSyncToCloudSanitizer";

const sanitizeSyncDataFromCloud = readCloudSyncData;
const sanitizeSyncDataForCloud = writeCloudSyncData;

export { sanitizeSyncDataForCloud, sanitizeSyncDataFromCloud };
