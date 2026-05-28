import { useDocumentCommands } from "./useDocumentCommands";
import { useDocumentsRead } from "./useDocumentsRead";

export const useDocuments = (folderId?: string) => {
  const readState = useDocumentsRead(folderId);
  const commands = useDocumentCommands();

  return {
    ...readState,
    ...commands,
  };
};
