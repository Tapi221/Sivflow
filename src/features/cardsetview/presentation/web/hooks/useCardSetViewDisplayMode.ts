import { useCallback, useMemo, useState } from "react";
import { resolveCardSetDisplayMode, setCardSetSessionDisplayMode } from "@/services/cardDisplayModeSession";
import type { CardDisplayMode } from "@/types/domain/cardSet";



interface UseCardSetViewDisplayModeOptions {
  cardSetId: string | null;
  defaultDisplayMode?: CardDisplayMode | null;
}
type DisplayModeOverrideState = {
  scopeKey: string;
  mode: CardDisplayMode;
} | null;



const buildDisplayModeScopeKey = (
  cardSetId: string | null,
  defaultDisplayMode?: CardDisplayMode | null,
) => {
  return `${cardSetId ?? "__null__"}::${defaultDisplayMode ?? "__unset__"}`;
};
const useCardSetViewDisplayMode = ({ cardSetId, defaultDisplayMode }: UseCardSetViewDisplayModeOptions) => {
  const scopeKey = useMemo(() => buildDisplayModeScopeKey(cardSetId, defaultDisplayMode), [cardSetId, defaultDisplayMode]);

  const resolvedDisplayMode = useMemo(
    () => resolveCardSetDisplayMode(cardSetId, defaultDisplayMode ?? undefined),
    [cardSetId, defaultDisplayMode],
  );

  const [overrideState, setOverrideState] =
    useState<DisplayModeOverrideState>(null);

  const currentDisplayMode =
    overrideState?.scopeKey === scopeKey
      ? overrideState.mode
      : resolvedDisplayMode;

  const setCurrentDisplayMode = useCallback(
    (mode: CardDisplayMode) => {
      setCardSetSessionDisplayMode(cardSetId, mode);
      setOverrideState({
        scopeKey,
        mode,
      });
    },
    [cardSetId, scopeKey],
  );

  return {
    currentDisplayMode,
    setCurrentDisplayMode,
  };
};



export { useCardSetViewDisplayMode };
