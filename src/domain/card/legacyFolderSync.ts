type CardSetFolderSource = {
  folderId?: string | null;
};

// 移行方針:
// 1) cardSetId を正とする
// 2) 移行完了まで card.folderId はこの helper 経由でのみ dual-write する
// 3) fallback 使用件数が 0 になったら card.folderId 書き込みを削除する
const toNormalizedLegacyCardFolderId = (
  folderId: string | null | undefined,
) => {
  if (typeof folderId !== "string") return "";
  const trimmed = folderId.trim();
  return trimmed.length > 0 ? trimmed : "";
};

export const resolveLegacyCardFolderIdFromCardSet = (
  cardSet: CardSetFolderSource,
) => toNormalizedLegacyCardFolderId(cardSet.folderId);

export const syncLegacyCardFolderIdFromCardSet = <T extends object>(
  patch: T,
  cardSet: CardSetFolderSource,
): T & { folderId: string } => ({
  ...patch,
  folderId: resolveLegacyCardFolderIdFromCardSet(cardSet),
});
