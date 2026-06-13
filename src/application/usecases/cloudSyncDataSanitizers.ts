import { sanitizeSyncDataFromCloud as readCloudSyncData } from "./cloudSyncFromCloudSanitizer";
import { sanitizeSyncDataForCloud as writeCloudSyncData } from "./cloudSyncToCloudSanitizer";



const sanitizeSyncDataFromCloud = readCloudSyncData;
const sanitizeSyncDataForCloud = writeCloudSyncData;



export { sanitizeSyncDataForCloud, sanitizeSyncDataFromCloud };
