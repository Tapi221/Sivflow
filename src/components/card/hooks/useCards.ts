import { useCardCommands } from "./useCardCommands";
import { useCardsRead, type UseCardsReadOptions } from "./useCardsRead";

export const useCards = (
  folderId?: string,
  cardSetId?: string,
  options?: UseCardsReadOptions,
) => {
  const readState = useCardsRead(folderId, cardSetId, options);
  const commands = useCardCommands(folderId);

  return {
    ...readState,
    ...commands,
  };
};
