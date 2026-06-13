import { readCardStorageFiniteNumberField, readCardStorageStringField } from "./cardStorageFieldReaders";
import { sanitizeCardStorageLayout } from "./cardStorageLayoutTransforms";
import { isStorageRecord } from "@/domain/shared/storage/storageRecordUtils";



const sanitizeCardStorageImageRef = (imageValue: unknown) => {
  if (!isStorageRecord(imageValue)) return imageValue;

  const assetId =
    readCardStorageStringField(imageValue, "assetId") ??
    readCardStorageStringField(imageValue, "id");
  const remoteUrl = readCardStorageStringField(imageValue, "remoteUrl");
  const normalizedRemoteUrl =
    remoteUrl && remoteUrl.startsWith("http") ? remoteUrl : null;

  return {
    id: readCardStorageStringField(imageValue, "id") ?? assetId,
    assetId,
    localFileId: readCardStorageStringField(imageValue, "localFileId"),
    remoteUrl: normalizedRemoteUrl,
    storagePath: readCardStorageStringField(imageValue, "storagePath"),
    status:
      readCardStorageStringField(imageValue, "status") ??
      (normalizedRemoteUrl ? "ready" : "uploading"),
    error: readCardStorageStringField(imageValue, "error") ?? undefined,
    scale: readCardStorageFiniteNumberField(imageValue, "scale") ?? 1,
    x: readCardStorageFiniteNumberField(imageValue, "x") ?? 0,
    layout: sanitizeCardStorageLayout(imageValue.layout),
    naturalW: readCardStorageFiniteNumberField(imageValue, "naturalW"),
    naturalH: readCardStorageFiniteNumberField(imageValue, "naturalH"),
  };
};



export { sanitizeCardStorageImageRef };
