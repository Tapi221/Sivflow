const MF_DECK_FILE_EXTENSION = ".mfdeck";
const CARD_SET_SUFFIX_PATTERN = /\s*セット$/u;

export const stripMfDeckExtension = (value: string) => {
  return value.replace(/\.mfdeck$/iu, "").trim();
};

export const stripCardSetDisplaySuffix = (value: string) => {
  return value.replace(CARD_SET_SUFFIX_PATTERN, "").trim();
};

export const formatCardSetFileDisplayName = (
  rawName: string | null | undefined,
) => {
  const normalizedName = rawName?.trim() || "無題";
  const withoutExtension = stripMfDeckExtension(normalizedName);
  const withoutSetSuffix = stripCardSetDisplaySuffix(withoutExtension);
  const baseName = withoutSetSuffix || withoutExtension || "無題";

  return `${baseName}${MF_DECK_FILE_EXTENSION}`;
};
