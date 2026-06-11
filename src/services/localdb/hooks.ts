import { assertNoBlobUrlInCardPayload, buildCardCandidateFromMods } from "./blobUrl";
import type { LocalDB } from "./LocalDB";



const getEntityId = (obj: unknown): string | undefined => {
  if (typeof obj !== "object" || obj === null || !("id" in obj))
    return undefined;
  const id = (obj as { id: unknown; }).id;
  return typeof id === "string"
    ? id
    : typeof id === "number"
      ? String(id)
      : undefined;
};
const attachHooks = (db: LocalDB): void => {
  const cardsTable = db.table("cards");
  cardsTable.hook("creating", (_primaryKey, obj) => {
    assertNoBlobUrlInCardPayload(obj, {
      entityType: "card",
      entityId: getEntityId(obj),
    });
  });
  cardsTable.hook("updating", (mods, _primaryKey, obj) => {
    const candidate = buildCardCandidateFromMods(obj, mods);
    assertNoBlobUrlInCardPayload(candidate, {
      entityType: "card",
      entityId: getEntityId(obj),
    });
  });
};



export { attachHooks };
