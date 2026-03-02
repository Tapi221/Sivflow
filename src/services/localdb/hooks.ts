import type { LocalDB } from './LocalDB';
import { assertNoBlobUrlInCardPayload, buildCardCandidateFromMods } from './blobUrl';

export const attachHooks = (db: LocalDB): void => {
  const cardsTable = db.table('cards');
  cardsTable.hook('creating', (_primaryKey, obj) => {
    assertNoBlobUrlInCardPayload(obj, { entityType: 'card', entityId: (obj as any)?.id });
  });
  cardsTable.hook('updating', (mods, _primaryKey, obj) => {
    const candidate = buildCardCandidateFromMods(obj, mods);
    assertNoBlobUrlInCardPayload(candidate, { entityType: 'card', entityId: (obj as any)?.id });
  });
};
