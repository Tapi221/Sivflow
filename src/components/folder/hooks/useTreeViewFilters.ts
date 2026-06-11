import { useMemo } from "react";
import { resolveCardTagNames } from "@/features/settings/hooks/useTags";
import type { Card, DocumentItem } from "@/types";



type TagMapLike = Parameters<typeof resolveCardTagNames>[1];
type ContentTypeFilter = "card" | "pdf";
interface UseTreeViewFiltersParams {
  cards: Card[];
  documents: DocumentItem[];
  tagFilter: string[];
  tagMatchMode: "any" | "all";
  uncertaintyFilter: "any" | "on" | "off";
  bookmarkedFilter: "any" | "on" | "off";
  draftFilter: "any" | "on" | "off";
  contentTypeFilter: ContentTypeFilter[];
  tagById: TagMapLike;
}



const useTreeViewFilters = ({ cards, documents, tagFilter, tagMatchMode, uncertaintyFilter, bookmarkedFilter, draftFilter, contentTypeFilter, tagById }: UseTreeViewFiltersParams) => {
  const isFilterActive = tagFilter.length > 0 || uncertaintyFilter !== "any" || bookmarkedFilter !== "any" || draftFilter !== "any" || contentTypeFilter.length < 2;

  const { filteredCards, filteredDocuments, isFiltering } = useMemo(() => {
    if (!isFilterActive) {
      return {
        filteredCards: cards,
        filteredDocuments: documents.filter(
          (document) => document.kind === "pdf",
        ),
        isFiltering: false,
      };
    }

    const allowCards = contentTypeFilter.includes("card");
    const allowPdf = contentTypeFilter.includes("pdf");

    const nextCards = cards.filter((card) => {
      if (!allowCards) return false;

      if (tagFilter.length > 0) {
        const resolvedNames = resolveCardTagNames(card.tagIds, tagById);

        if (resolvedNames.length === 0) return false;

        const cardTagSet = new Set(resolvedNames);
        const tagMatched =
          tagMatchMode === "any"
            ? tagFilter.some((tag) => cardTagSet.has(tag))
            : tagFilter.every((tag) => cardTagSet.has(tag));

        if (!tagMatched) return false;
      }

      const hasUncertainty = Boolean(card.hasUncertainty);
      const isBookmarked = Boolean(card.isBookmarked);
      const isDraft = Boolean(card.isDraft);

      if (uncertaintyFilter === "on" && !hasUncertainty) return false;
      if (uncertaintyFilter === "off" && hasUncertainty) return false;
      if (bookmarkedFilter === "on" && !isBookmarked) return false;
      if (bookmarkedFilter === "off" && isBookmarked) return false;
      if (draftFilter === "on" && !isDraft) return false;
      if (draftFilter === "off" && isDraft) return false;

      return true;
    });

    const nextDocuments = documents.filter((document) => {
      if (document.isDeleted) return false;
      if (document.kind === "pdf") return allowPdf;
      return false;
    });

    return {
      filteredCards: nextCards,
      filteredDocuments: nextDocuments,
      isFiltering: true,
    };
  }, [
    bookmarkedFilter,
    cards,
    contentTypeFilter,
    documents,
    draftFilter,
    isFilterActive,
    tagById,
    tagFilter,
    tagMatchMode,
    uncertaintyFilter,
  ]);

  return {
    isFilterActive,
    filteredCards,
    filteredDocuments,
    isFiltering,
  };
};



export { useTreeViewFilters };
