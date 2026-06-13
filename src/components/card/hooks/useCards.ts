import { useCardCommands } from "@/components/card/hooks/useCardCommands";
import type { UseCardsReadOptions } from "@/components/card/hooks/useCardsRead";
import { useCardsRead } from "@/components/card/hooks/useCardsRead";

const useCards = (folderId?: string, cardSetId?: string, options?: UseCardsReadOptions) => {
  const readState = useCardsRead(folderId, cardSetId, options);
  const commands = useCardCommands(folderId);

  return {
    ...readState,
    ...commands,
  };
};

export { useCards };
