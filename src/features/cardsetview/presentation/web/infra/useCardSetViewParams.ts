import { useMemo } from "react";
import { useLocation } from "react-router-dom";



type ParsedCardSetViewParams = {
  cardSetId: string | null;
  initialIndex: number;
  targetCardId: string | null;
};



const parseCardSetViewParams = (search: string): ParsedCardSetViewParams => {
  const urlParams = new URLSearchParams(search);
  const cardSetId = urlParams.get("cardSetId");
  const initialIndexRaw = Number.parseInt(urlParams.get("index") ?? "0", 10);
  const targetCardId = urlParams.get("cardId");

  return {
    cardSetId,
    initialIndex:
      Number.isFinite(initialIndexRaw) && initialIndexRaw >= 0
        ? initialIndexRaw
        : 0,
    targetCardId,
  };
};
const useCardSetViewParams = () => {
  const { search } = useLocation();

  return useMemo(() => parseCardSetViewParams(search), [search]);
};



export { useCardSetViewParams };


export type { ParsedCardSetViewParams };
