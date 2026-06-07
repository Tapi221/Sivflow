import { AUX_STORES } from "./schemaStores.aux";
import { CARD_STORES } from "./schemaStores.cards";
import { CORE_STORES } from "./schemaStores.core";
import { SYNC_STORES } from "./schemaStores.sync";

export const LOCAL_DB_STORES = {
  ...CORE_STORES,
  ...CARD_STORES,
  ...SYNC_STORES,
  ...AUX_STORES,
};
