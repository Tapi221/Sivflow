import { useEffect, useRef } from "react";
import type { Card } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";

interface Folder {
  id: string;
  folderName: string;
  parentFolderId?: string | null;
}

interface Crumb {
  label: string;
  to?: string;
  folderId?: string | null;
}

interface UseCardViewBreadcrumbsOptions {
  folderId: string | null;
  selectedCardSet: CardSet | null;
  selectedCard: Card | null;
  sortedCards: Card[];
  folders: Folder[];
  setExtraCrumbs: (crumbs: Crumb[]) => void;
}

export function useCardViewBreadcrumbs({
  folderId,
  selectedCardSet,
  selectedCard,
  sortedCards,
  folders,
  setExtraCrumbs,
}: UseCardViewBreadcrumbsOptions) {
  const lastSignatureRef = useRef("");

  useEffect(() => {
    const crumbs: Crumb[] = [];
    const crumbFolderId = folderId ?? selectedCardSet?.folderId ?? null;

    if (crumbFolderId) {
      const path: Folder[] = [];
      let cur = folders.find((f) => f.id === crumbFolderId);
      while (cur) {
        path.unshift(cur);
        cur = folders.find((f) => f.id === cur!.parentFolderId);
      }
      path.forEach((folder) => {
        crumbs.push({
          label: folder.folderName,
          to: `/folders?folderId=${folder.id}`,
          folderId: folder.id,
        });
      });
    }

    if (selectedCardSet) {
      const qs = new URLSearchParams();
      const crumbFolderId2 = folderId ?? selectedCardSet.folderId ?? null;
      if (crumbFolderId2) qs.set("folderId", crumbFolderId2);
      qs.set("cardSetId", selectedCardSet.id);
      crumbs.push({
        label: selectedCardSet.name || "カードセット",
        to: `/folders?${qs.toString()}`,
        folderId: crumbFolderId2,
      });
    }

    if (selectedCard) {
      const title = selectedCard.title?.trim() ?? "";
      const cardIndex = sortedCards.findIndex((card) => card.id === selectedCard.id);
      const current = cardIndex >= 0 ? cardIndex + 1 : 1;
      const total = Math.max(1, sortedCards.length);
      const label = title ? `${current}/${total} : ${title}` : `${current}/${total}`;
      crumbs.push({ label });
    }

    const signature = JSON.stringify(crumbs);
    if (lastSignatureRef.current !== signature) {
      lastSignatureRef.current = signature;
      setExtraCrumbs(crumbs);
    }
  }, [selectedCardSet, selectedCard, sortedCards, folderId, folders, setExtraCrumbs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      lastSignatureRef.current = "";
      setExtraCrumbs([]);
    };
  }, [setExtraCrumbs]);
}

