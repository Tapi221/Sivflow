import { useCardCommands } from "./useCardCommands";
import type { UseCardsReadOptions } from "./useCardsRead";
import { useCardsRead } from "./useCardsRead";



const useCards = (folderId?: string, cardSetId?: string, options?: UseCardsReadOptions) => {
  const readState = useCardsRead(folderId, cardSetId, options);
  const commands = useCardCommands(folderId);

  return {
    ...readState,
    ...commands,
  };
};



export { useCards };
