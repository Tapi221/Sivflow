import { resolveCardTagNames } from "@/hooks/settings/useTags";
import type { Card, DocumentItem } from "@/types";
import { useMemo } from "react";

type TagMapLike = Parameters<typeof resolveCardTagNames>[1];

interface UseTreeViewFiltersParams {
  cards: Card[];
  documents: DocumentItem[];
  explorerTab: string;
  tagFilter: string[];
  tagMatchMode: "any" | "all";
  uncertaintyFilter: "any" | "on" | "off";
  bookmarkedFilter: "any" | "on" | "off";
  draftFilter: "any" | "on" | "off";
  contentTypeFilter: string[];
  tagById: TagMapLike;
}

export const useTreeViewFilters = ({
  cards,
  documents,
  explorerTab,
  tagFilter,
  tagMatchMode,
  uncertaintyFilter,
  bookmarkedFilter,
  draftFilter,
  contentTypeFilter,
  tagById,
}: UseTreeViewFiltersParams) => {
  const isFilterTargetTab = explorerTab === "explorer";

  const isFilterActive =
    isFilterTargetTab &&
    (tagFilter.length > 0 ||
      uncertaintyFilter !== "any" ||
      bookmarkedFilter !== "any" ||
      draftFilter !== "any" ||
      contentTypeFilter.length < 3);

  const { filteredCards, filteredDocuments, isFiltering } = useMemo(() => {
    const active =
      isFilterTargetTab &&
      (tagFilter.length > 0 ||
        uncertaintyFilter !== "any" ||
        bookmarkedFilter !== "any" ||
        draftFilter !== "any" ||
        contentTypeFilter.length < 3);

    if (!active) {
      return {
        filteredCards: cards,
        filteredDocuments: documents,
        isFiltering: false,
      };
    }

    const allowCards = contentTypeFilter.includes("card");
    const allowPdf = contentTypeFilter.includes("pdf");
    const allowPptx = contentTypeFilter.includes("pptx");

    const filtered = cards.filter((card) => {
      if (!allowCards) return false;

      if (tagFilter.length > 0) {
        const resolvedNames = resolveCardTagNames(card.tagIds, tagById);

        if (resolvedNames.length === 0) return false;

        const cardTagSet = new Set(resolvedNames);
        const tagMatched =
          tagMatchMode === "any"
            ? tagFilter.some((t) => cardTagSet.has(t))
            : tagFilter.every((t) => cardTagSet.has(t));

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
      if (document.kind === "pptx") return allowPptx;
      return false;
    });

    return {
      filteredCards: filtered,
      filteredDocuments: nextDocuments,
      isFiltering: true,
    };
  }, [
    cards,
    documents,
    tagFilter,
    tagMatchMode,
    isFilterTargetTab,
    uncertaintyFilter,
    bookmarkedFilter,
    draftFilter,
    contentTypeFilter,
    tagById,
  ]);

  return {
    isFilterTargetTab,
    isFilterActive,
    filteredCards,
    filteredDocuments,
    isFiltering,
  };
};

