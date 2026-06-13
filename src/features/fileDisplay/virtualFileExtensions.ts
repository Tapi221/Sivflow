const MF_DECK_FILE_EXTENSION = ".mfdeck";
const MF_CARD_FILE_EXTENSION = ".mfcard";



const appendVirtualFileExtension = (name: string, extension: string) => {
  const trimmedName = name.trim();

  if (trimmedName === "") {
    return `無題${extension}`;
  }

  if (trimmedName.toLowerCase().endsWith(extension)) {
    return trimmedName;
  }

  return `${trimmedName}${extension}`;
};
const toVirtualMfDeckDisplayName = (name: string) => {
  return appendVirtualFileExtension(name, MF_DECK_FILE_EXTENSION);
};
const toVirtualMfCardDisplayName = (name: string) => {
  return appendVirtualFileExtension(name, MF_CARD_FILE_EXTENSION);
};



export { toVirtualMfDeckDisplayName, toVirtualMfCardDisplayName };
