import { isStorageRecord } from "@/domain/shared/storage/storageRecordUtils";
import { readCardStorageFiniteNumberField } from "./cardStorageFieldReaders";



const sanitizeCardStorageLayout = (layoutValue: unknown) => {
  if (!isStorageRecord(layoutValue)) return null;

  return {
    baseWidthPx: readCardStorageFiniteNumberField(layoutValue, "baseWidthPx"),
    cropX: readCardStorageFiniteNumberField(layoutValue, "cropX"),
  };
};



export { sanitizeCardStorageLayout };
