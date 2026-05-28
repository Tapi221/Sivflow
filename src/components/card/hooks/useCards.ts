import { useCardCommands } from "@/components/card/hooks/useCardCommands";
import { useCardsRead, type UseCardsReadOptions } from "@/components/card/hooks/useCardsRead";

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
