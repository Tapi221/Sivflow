const MF_CARD_FILE_EXTENSION = ".mfcard";



const stripMfCardExtension = (value: string) => {
  return value.replace(/\.mfcard$/iu, "").trim();
};
const formatCardFileDisplayName = (rawName: string | null | undefined) => {
  const normalizedName = rawName?.trim() ?? "無題のカード";
  const baseName = stripMfCardExtension(normalizedName) ?? "無題のカード";

  return `${baseName}${MF_CARD_FILE_EXTENSION}`;
};



export { stripMfCardExtension, formatCardFileDisplayName };
