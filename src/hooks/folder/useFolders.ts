import { useFolderCommands } from "./useFolderCommands";
import { useFoldersRead } from "./useFoldersRead";

export const useFolders = () => {
  const readState = useFoldersRead();
  const commands = useFolderCommands();

  return {
    ...readState,
    ...commands,
  };
};
