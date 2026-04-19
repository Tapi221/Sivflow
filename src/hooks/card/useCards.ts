import { useCardCommands } from "@/hooks/card/useCardCommands";
import {
  type UseCardsReadOptions,
  useCardsRead,
} from "@/hooks/card/useCardsRead";

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
