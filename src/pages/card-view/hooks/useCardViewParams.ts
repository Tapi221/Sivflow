import { useState } from "react";

export type ParsedParams = {
  folderId: string | null;
  cardSetId: string | null;
  initialIndex: number;
  targetCardId: string | null;
};

function parseCardViewParams(): ParsedParams {
  if (typeof window === "undefined") {
    return {
      folderId: null,
      cardSetId: null,
      initialIndex: 0,
      targetCardId: null,
    };
  }

  const urlParams = new URLSearchParams(window.location.search);
  const folderId = urlParams.get("folderId");
  const cardSetId = urlParams.get("cardSetId");
  const initialIndexRaw = Number.parseInt(urlParams.get("index") || "0", 10);
  const targetCardId = urlParams.get("cardId");

  return {
    folderId,
    cardSetId,
    initialIndex:
      Number.isFinite(initialIndexRaw) && initialIndexRaw >= 0
        ? initialIndexRaw
        : 0,
    targetCardId,
  };
}

export function useCardViewParams(): ParsedParams {
  const [params] = useState<ParsedParams>(() => parseCardViewParams());
  return params;
}
