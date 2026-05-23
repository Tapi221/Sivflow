import { useMemo, useState } from "react";

import { getCardText } from "@/domain/card/content";
import {
  buildCardSetById,
  resolveCardFolderIdStrict,
} from "@/domain/card/selectors/cardFolder";

import { getTagColorKey, type TagColorKey } from "@/features/tag/tagColor";

import { Flashcard } from "@/components/card/frame/Flashcard";
import { TagFilterPopover } from "@/chip/popover/TagFilterPopover";
import { TagBadge } from "@/components/tag/TagBadge";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HelpCircle, Settings2, Star, Tag as TagIcon } from "@/ui/icons";

import { DirectoryMindMapCanvas } from "./directory/DirectoryMindMapCanvas";
import type {
  DirectoryBadgeVisibility,
  DirectoryTreeNode,
} from "./directory/directoryTypes";

import { useCardSets } from "@/hooks/cardSet/useCardSets";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import { resolveCardTagNames, useTags } from "@/hooks/settings/useTags";
import { cn } from "@/lib/utils";
import type { Card, CardSet, DocumentItem, Folder } from "@/types";

interface DirectoryDiagramPaneProps {
  folders: Folder[];
  cards: Card[];
  cardSets?: CardSet[];
  documents: DocumentItem[];
}

const ROOT_KEY = "__root__";

type DirectoryLayoutMode = "map" | "tree";

const getCardLabel = (card: Card): string => {
  if (typeof card.title === "string" && card.title.trim()) {
    return card.title.trim();
  }

  const source = getCardText(card, "question");
  const plain = source
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!plain) return "カード";
  return plain.length > 10 ? `${plain.slice(0, 10)}...` : plain;
};

const DirectoryOutlineNode = ({
  node,
  hasParent,
  isLast,
  getTagColor,
  badgeVisibility,
  onCardClick,
}: {
  node: DirectoryTreeNode;
  hasParent: boolean;
  isLast: boolean;
  getTagColor: (tagNameOrId: string) => TagColorKey;
  badgeVisibility: DirectoryBadgeVisibility;
  onCardClick: (cardId: string) => void;
}) => {
  const isFolderNode = node.kind === "folder";
  const isCardNode =
    node.kind === "card" && typeof node.sourceCardId === "string";

  const labelClassName = cn(
    "relative z-10 inline-flex min-h-7 items-center gap-2 font-serif text-base font-medium leading-[24px] text-[#222222]",
    isFolderNode
      ? "min-h-0 border-b border-slate-400 px-0 pb-[1px] pt-0 leading-[20px]"
      : "rounded-md bg-white px-1.5 py-0",
    isCardNode &&
      "cursor-pointer transition-colors duration-150 hover:bg-slate-100 focus-visible:bg-slate-100",
  );

  const labelContent = (
    <>
      <span className="shrink-0">{node.name}</span>
      {node.showTags ? (
        <div className="flex flex-wrap items-center gap-1">
          {badgeVisibility.uncertainty && node.hasUncertainty ? (
            <HelpCircle className="h-4 w-4 shrink-0 text-slate-500" />
          ) : null}
          {badgeVisibility.bookmarked && node.isBookmarked ? (
            <Star className="h-4 w-4 shrink-0 fill-current text-amber-500" />
          ) : null}
          {badgeVisibility.tags
            ? node.tags.map((tag) => (
              <TagBadge
                key={`${node.id}:${tag}`}
                label={tag}
                colorKey={getTagColor(tag)}
                className="shrink-0 align-middle"
              />
            ))
            : null}
        </div>
      ) : null}
    </>
  );

  return (
    <div className="relative">
      {hasParent && !isLast ? (
        <div
          className="absolute left-0 border-slate-300"
          style={{
            top: 0,
            bottom: 0,
            borderLeftWidth: "1px",
          }}
        />
      ) : null}

      <div className={cn("relative min-h-7", hasParent ? "pl-3" : "pl-0")}>
        {hasParent ? (
          <>
            {isLast ? (
              <div
                className="absolute left-0 top-0 border-slate-300"
                style={{
                  height: "50%",
                  borderLeftWidth: "1px",
                }}
              />
            ) : null}
            <div
              className="absolute left-0 top-1/2 border-slate-300"
              style={{
                width: "var(--ui-space-3)",
                borderTopWidth: "1px",
                transform: "translateY(-0.5px)",
              }}
            />
          </>
        ) : null}

        {isCardNode ? (
          <button
            type="button"
            onClick={() => onCardClick(node.sourceCardId!)}
            className={cn(
              labelClassName,
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
            )}
            aria-label={`${node.name} をプレビュー`}
          >
            {labelContent}
          </button>
        ) : (
          <div className={labelClassName}>{labelContent}</div>
        )}
      </div>

      {node.children.length > 0 ? (
        <div className="ml-4">
          {node.children.map((child, index) => (
            <DirectoryOutlineNode
              key={child.id}
              node={child}
              hasParent
              isLast={index === node.children.length - 1}
              getTagColor={getTagColor}
              badgeVisibility={badgeVisibility}
              onCardClick={onCardClick}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const DirectoryDiagramPane = ({
  folders,
  cards,
  cardSets: cardSetsProp,
  documents,
}: DirectoryDiagramPaneProps) => {
  const { cardSets: cardSetsFromHook = [] } = useCardSets();
  const cardSets = (cardSetsProp ?? cardSetsFromHook) as CardSet[];
  const cardSetById = useMemo(
    () => buildCardSetById(cardSets.filter((cardSet) => !cardSet.isDeleted)),
    [cardSets],
  );
  const { tags, tagById } = useTags();

  const [layoutMode, setLayoutMode] = useState<DirectoryLayoutMode>("map");
  const [previewCardId, setPreviewCardId] = useState<string | null>(null);

  const {
    tagFilter,
    tagMatchMode,
    uncertaintyFilter,
    bookmarkedFilter,
    draftFilter,
    contentTypeFilter,
    directoryBadgeVisibility,
    toggleDirectoryBadgeVisibility,
  } = useExplorerStore();

  const isFilterActive =
    tagFilter.length > 0 ||
    uncertaintyFilter !== "any" ||
    bookmarkedFilter !== "any" ||
    draftFilter !== "any" ||
    contentTypeFilter.length < 2;

  const tagColorMap = useMemo(() => {
    const map = new Map<string, TagColorKey>();

    tags.forEach((tag) => {
      const colorKey = getTagColorKey(tag.color);
      map.set(tag.id, colorKey);
      map.set(tag.name, colorKey);
      map.set(tag.nameLower, colorKey);
    });

    return map;
  }, [tags]);

  const resolveTagColor = (tagNameOrId: string): TagColorKey =>
    tagColorMap.get(tagNameOrId) ??
    tagColorMap.get(tagNameOrId.toLowerCase()) ??
    getTagColorKey();

  const allTags = useMemo(() => {
    const tagNames = new Set<string>();

    cards.forEach((card) => {
      resolveCardTagNames(card.tagIds, tagById).forEach((tag) =>
        tagNames.add(tag),
      );
    });

    return Array.from(tagNames).sort((a, b) => a.localeCompare(b, "ja"));
  }, [cards, tagById]);

  const { filteredCards, filteredDocuments } = useMemo(() => {
    const visibleDocuments = documents.filter(
      (document) => !document.isDeleted && document.kind === "pdf",
    );

    if (!isFilterActive) {
      return {
        filteredCards: cards,
        filteredDocuments: visibleDocuments,
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

    const nextDocuments = visibleDocuments.filter(() => allowPdf);

    return {
      filteredCards: nextCards,
      filteredDocuments: nextDocuments,
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

  const rootNodes = useMemo<DirectoryTreeNode[]>(() => {
    const visibleFolders = folders.filter(
      (folder) => !folder.isDeleted && !folder.isHidden,
    );

    const childFolderMap = new Map<string, Folder[]>();
    const itemMap = new Map<string, DirectoryTreeNode[]>();

    for (const folder of visibleFolders) {
      const folderId = String(folder.id || folder.folderId || "");
      if (!folderId) continue;

      const parentId = String(folder.parentFolderId || ROOT_KEY);
      const siblings = childFolderMap.get(parentId) ?? [];
      siblings.push(folder);
      childFolderMap.set(parentId, siblings);
    }

    for (const card of filteredCards) {
      if (card.isDeleted) continue;

      const folderId = resolveCardFolderIdStrict(card, cardSetById) ?? "";
      if (!folderId) continue;

      const items = itemMap.get(folderId) ?? [];
      const cardTags = resolveCardTagNames(card.tagIds, tagById);

      items.push({
        id: `card:${card.id}`,
        kind: "card",
        name: getCardLabel(card),
        sourceCardId: card.id,
        tags: cardTags,
        hasUncertainty: Boolean(card.hasUncertainty),
        isBookmarked: Boolean(card.isBookmarked),
        showTags: true,
        children: [],
      });

      itemMap.set(folderId, items);
    }

    for (const document of filteredDocuments) {
      const folderId = String(document.folderId || "");
      if (!folderId) continue;

      const items = itemMap.get(folderId) ?? [];
      items.push({
        id: `${document.kind}:${document.id}`,
        kind: "pdf",
        name: document.title?.trim() || document.fileName || "PDF",
        tags: [],
        hasUncertainty: false,
        isBookmarked: false,
        showTags: false,
        children: [],
      });

      itemMap.set(folderId, items);
    }

    for (const siblings of childFolderMap.values()) {
      siblings.sort((a, b) => {
        const orderDiff = Number(a.orderIndex ?? 0) - Number(b.orderIndex ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return (a.folderName || "").localeCompare(b.folderName || "", "ja");
      });
    }

    for (const items of itemMap.values()) {
      items.sort((a, b) => a.name.localeCompare(b.name, "ja"));
    }

    const buildNode = (folder: Folder): DirectoryTreeNode | null => {
      const id = String(folder.id || folder.folderId || "");

      const folderChildren = (childFolderMap.get(id) ?? [])
        .map(buildNode)
        .filter((child): child is DirectoryTreeNode => child !== null);

      const itemChildren = itemMap.get(id) ?? [];

      if (
        isFilterActive &&
        folderChildren.length === 0 &&
        itemChildren.length === 0
      ) {
        return null;
      }

      return {
        id,
        kind: "folder",
        name: folder.folderName || "無名フォルダ",
        tags: [],
        hasUncertainty: false,
        isBookmarked: false,
        showTags: false,
        children: [...folderChildren, ...itemChildren],
      };
    };

    return (childFolderMap.get(ROOT_KEY) ?? [])
      .map(buildNode)
      .filter((node): node is DirectoryTreeNode => node !== null);
  }, [
    filteredDocuments,
    filteredCards,
    folders,
    isFilterActive,
    tagById,
    cardSetById,
  ]);

  const previewCard = useMemo(
    () =>
      previewCardId
        ? (cards.find((card) => card.id === previewCardId) ?? null)
        : null,
    [cards, previewCardId],
  );

  return (
    <div className="h-full overflow-auto bg-transparent">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              ディレクトリ
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              ドラッグで移動、ホイールで拡大縮小
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
              {[
                { id: "map", label: "マップ" },
                { id: "tree", label: "ツリー" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLayoutMode(item.id as DirectoryLayoutMode)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    layoutMode === item.id
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100",
                  )}
                  aria-pressed={layoutMode === item.id}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="shrink-0 rounded-md border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                  aria-label="ディレクトリバッジ表示設定"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </PopoverTrigger>

              <PopoverContent align="end" className="w-52 p-2">
                <div className="space-y-1">
                  {[
                    {
                      key: "uncertainty" as const,
                      label: "はてなマーク",
                      icon: HelpCircle,
                    },
                    {
                      key: "bookmarked" as const,
                      label: "お気に入り",
                      icon: Star,
                    },
                    { key: "tags" as const, label: "タグ", icon: TagIcon },
                  ].map((item) => {
                    const Icon = item.icon;
                    const checked = directoryBadgeVisibility[item.key];

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => toggleDirectoryBadgeVisibility(item.key)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                          checked
                            ? "bg-slate-100 text-slate-900"
                            : "text-slate-600 hover:bg-slate-50",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            item.key === "bookmarked" &&
                              checked &&
                              "fill-current text-amber-500",
                          )}
                        />
                        <span className="flex-1 text-left">{item.label}</span>
                        <span
                          className={cn(
                            "text-xs",
                            checked ? "text-primary-700" : "text-slate-400",
                          )}
                        >
                          {checked ? "表示" : "非表示"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            <TagFilterPopover
              allTags={allTags}
              className="shrink-0 rounded-md border border-slate-200 bg-white hover:bg-slate-50"
            />
          </div>
        </div>
      </div>

      <div className="p-3">
        {rootNodes.length > 0 ? (
          <div className="relative">
            {layoutMode === "map" ? (
              <DirectoryMindMapCanvas
                rootNodes={rootNodes}
                getTagColor={resolveTagColor}
                badgeVisibility={directoryBadgeVisibility}
                onCardClick={setPreviewCardId}
              />
            ) : (
              rootNodes.map((node, index) => (
                <DirectoryOutlineNode
                  key={node.id}
                  node={node}
                  hasParent={false}
                  isLast={index === rootNodes.length - 1}
                  getTagColor={resolveTagColor}
                  badgeVisibility={directoryBadgeVisibility}
                  onCardClick={setPreviewCardId}
                />
              ))
            )}
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            表示できるフォルダがありません。
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(previewCard)}
        onOpenChange={(open) => !open && setPreviewCardId(null)}
      >
        <DialogPortal>
          <DialogOverlay className="bg-transparent" />
          <DialogContent className="w-screen max-w-none border-none bg-transparent p-0 shadow-none [&>button]:hidden">
            <div
              className="max-h-[92vh] overflow-auto px-2 py-8 sm:px-6"
              onClick={() => setPreviewCardId(null)}
            >
              {previewCard ? (
                <div
                  className="mx-auto w-fit"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Flashcard
                    card={
                      previewCard as unknown as
                        | import("@/components/card/frame/Flashcard").FlashcardCardLike
                        | null
                    }
                    previewMode
                    className="mx-auto"
                    allowUpscale
                    maxScale={1.75}
                    contentPaddingPx={0}
                  />
                </div>
              ) : null}
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
};
