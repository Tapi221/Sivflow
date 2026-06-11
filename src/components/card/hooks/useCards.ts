import { useCardCommands } from "./useCardCommands";
import { useCardsRead } from "./useCardsRead";
import type { UseCardsReadOptions } from "./useCardsRead";



const useCards = (folderId?: string, cardSetId?: string, options?: UseCardsReadOptions) => { const readState = useCardsRead(folderId, cardSetId, options);
  const commands = useCardCommands(folderId);

  return {
    ...readState,
    ...commands,
  };
};



export { useCards };
