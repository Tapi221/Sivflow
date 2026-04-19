import { useDocumentCommands } from "@/hooks/platform/useDocumentCommands";
import { useDocumentsRead } from "@/hooks/platform/useDocumentsRead";

export const useDocuments = (folderId?: string) => {
  const readState = useDocumentsRead(folderId);
  const commands = useDocumentCommands();

  return {
    ...readState,
    ...commands,
  };
};
