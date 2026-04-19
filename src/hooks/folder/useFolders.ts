import { useFolderCommands } from "@/hooks/folder/useFolderCommands";
import { useFoldersRead } from "@/hooks/folder/useFoldersRead";

export const useFolders = () => {
  const readState = useFoldersRead();
  const commands = useFolderCommands();

  return {
    ...readState,
    ...commands,
  };
};
