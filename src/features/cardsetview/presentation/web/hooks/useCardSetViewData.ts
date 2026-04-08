import { useCardSetViewQuery } from "@/features/cardsetview/application/queries/useCardSetViewQuery";

interface UseCardSetViewDataOptions {
  folderId: string | null;
  cardSetId: string | null;
}

export const useCardSetViewData = ({
  folderId,
  cardSetId,
}: UseCardSetViewDataOptions) => {
  return useCardSetViewQuery({
    folderId,
    cardSetId,
  });
};
