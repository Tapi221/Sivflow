import { useCardSetViewQuery } from "@/features/cardsetview/application/queries/useCardSetViewQuery";



interface UseCardSetViewDataOptions {
  cardSetId: string | null;
}



const useCardSetViewData = ({ cardSetId }: UseCardSetViewDataOptions) => {
  return useCardSetViewQuery({ cardSetId });
};



export { useCardSetViewData };
