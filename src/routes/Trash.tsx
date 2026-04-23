import React, { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuthSession } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Trash2,
  RotateCcw,
  Folder,
  FileText,
  AlertTriangle,
  Search,
  Filter,
  ChevronDown,
} from "@/ui/icons";
import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import {
  buildCardSetById,
  resolveCardFolderIdStrict,
} from "@/domain/card/selectors/cardFolder";
import { normalizeFolder } from "@/domain/folder/normalizers/normalizeFolder";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { getLocalDb } from "@/services/localDB";
import { firestoreDb } from "@/services/firebase";
import { deleteDoc, doc, Timestamp, updateDoc } from "firebase/firestore";
import {
  folderDocPathSegments,
  cardDocPathSegments,
} from "@/services/firestorePaths";
import { getCardImages, getCardText } from "@/domain/card/content";
import type { Card as CardEntity, Folder as FolderEntity } from "@/types";
import type { Timestamp as FirestoreTimestamp } from "firebase/firestore";

type SelectedIds = {
  folders: string[];
  cards: string[];
};

type PreviewItem = CardEntity | null;

const normalizeCaseFold = (value: string | null | undefined): string => {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
};

const isFirestoreTimestamp = (
  value: Date | FirestoreTimestamp | null | undefined,
): value is FirestoreTimestamp => {
  return (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  );
};

const toSafeDate = (
  value: Date | FirestoreTimestamp | null | undefined,
): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (isFirestoreTimestamp(value)) return value.toDate();
  return null;
};

const formatDateTime = (
  value: Date | FirestoreTimestamp | null | undefined,
): string => {
  const date = toSafeDate(value);
  return date ? format(date, "yyyy/MM/dd HH:mm", { locale: ja }) : "-";
};

const errorToMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const maybeUpdateFirestoreDeletedState = async ({
  pathSegments,
  isDeleted,
}: {
  pathSegments: string[];
  isDeleted: boolean;
}): Promise<void> => {
  if (!firestoreDb) return;

  const targetRef = doc(firestoreDb, ...pathSegments);
  await updateDoc(targetRef, {
    isDeleted,
    deletedAt: isDeleted ? Timestamp.now() : null,
    updatedAt: Timestamp.now(),
  });
};

const maybeDeleteFirestoreDoc = async (
  pathSegments: string[],
): Promise<void> => {
  if (!firestoreDb) return;
  const targetRef = doc(firestoreDb, ...pathSegments);
  await deleteDoc(targetRef);
};

const restoreFolderWithParents = async ({
  userId,
  folderId,
}: {
  userId: string;
  folderId: string;
}): Promise<void> => {
  const db = await getLocalDb(userId);
  const rawFolder = await db.getItem("folders", folderId);
  if (!rawFolder) {
    throw new Error(`Folder not found: ${folderId}`);
  }

  const folder = normalizeFolder(rawFolder);

  if (folder.parentFolderId) {
    const rawParentFolder = await db.getItem("folders", folder.parentFolderId);
    if (rawParentFolder) {
      const parentFolder = normalizeFolder(rawParentFolder);
      if (parentFolder.isDeleted) {
        await restoreFolderWithParents({
          userId,
          folderId: folder.parentFolderId,
        });
      }
    }
  }

  await db.restore("folders", folderId);
  await maybeUpdateFirestoreDeletedState({
    pathSegments: folderDocPathSegments(userId, folderId),
    isDeleted: false,
  });
};

const groupCardsByFolderId = (
  cards: readonly CardEntity[],
  cardFolderIdByCardId: ReadonlyMap<string, string | null>,
  deletedFolders: readonly Pick<FolderEntity, "id">[],
): Map<string, CardEntity[]> => {
  const deletedFolderIdSet = new Set(
    deletedFolders.map((folder) => normalizeCaseFold(folder.id)),
  );
  const grouped = new Map<string, CardEntity[]>();

  for (const card of cards) {
    const folderId = cardFolderIdByCardId.get(card.id) ?? null;
    const normalizedFolderId = normalizeCaseFold(folderId);

    if (!normalizedFolderId || deletedFolderIdSet.has(normalizedFolderId)) {
      continue;
    }

    const existing = grouped.get(normalizedFolderId);
    if (existing) {
      existing.push(card);
    } else {
      grouped.set(normalizedFolderId, [card]);
    }
  }

  return grouped;
};

const Trash = () => {
  const { currentUser } = useAuthSession();
  const currentUserId = currentUser?.uid ?? null;

  const allFolders = useLiveQuery(
    async () => {
      if (!currentUserId) return [] as FolderEntity[];

      try {
        const db = await getLocalDb(currentUserId);
        return (await db.getAllFolders()).map(normalizeFolder);
      } catch (error) {
        console.error("Failed to load folders:", error);
        return [] as FolderEntity[];
      }
    },
    [currentUserId],
    [] as FolderEntity[],
  );

  const allCards = useLiveQuery(
    async () => {
      if (!currentUserId) return [] as CardEntity[];

      try {
        const db = await getLocalDb(currentUserId);
        return (await db.getAllCards()).map(normalizeCard);
      } catch (error) {
        console.error("Failed to load cards:", error);
        return [] as CardEntity[];
      }
    },
    [currentUserId],
    [] as CardEntity[],
  );

  const allCardSets = useLiveQuery(
    async () => {
      if (!currentUserId) return [];

      try {
        const db = await getLocalDb(currentUserId);
        return await db.cardSets
          .where("userId")
          .equals(currentUserId)
          .toArray();
      } catch (error) {
        console.error("Failed to load cardSets:", error);
        return [];
      }
    },
    [currentUserId],
    [],
  );

  const folders = useMemo(() => allFolders ?? [], [allFolders]);
  const allCardsData = useMemo(() => allCards ?? [], [allCards]);

  const deletedFolders = useMemo(
    () => folders.filter((folder) => folder.isDeleted === true),
    [folders],
  );

  const cardSetById = useMemo(
    () => buildCardSetById((allCardSets ?? []).filter((set) => !set.isDeleted)),
    [allCardSets],
  );

  const cardFolderIdByCardId = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const card of allCardsData) {
      map.set(card.id, resolveCardFolderIdStrict(card, cardSetById));
    }
    return map;
  }, [allCardsData, cardSetById]);

  const cards = useMemo(() => {
    const deletedFolderIdSet = new Set(
      deletedFolders.map((folder) => folder.id),
    );

    return allCardsData.filter((card) => {
      const folderId = cardFolderIdByCardId.get(card.id);
      return (
        card.isDeleted === true ||
        (folderId ? deletedFolderIdSet.has(folderId) : false)
      );
    });
  }, [allCardsData, cardFolderIdByCardId, deletedFolders]);

  const cardsWithoutResolvedFolder = useMemo(() => {
    return cards.filter((card) => !cardFolderIdByCardId.get(card.id));
  }, [cardFolderIdByCardId, cards]);

  const isLoading =
    allFolders === undefined ||
    allCards === undefined ||
    allCardSets === undefined;

  const [selectedIds, setSelectedIds] = useState<SelectedIds>({
    folders: [],
    cards: [],
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewCard, setPreviewCard] = useState<PreviewItem>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "week" | "month"
  >("all");

  const hasSelection =
    selectedIds.folders.length > 0 || selectedIds.cards.length > 0;

  const filterByDate = (
    deletedAt: Date | FirestoreTimestamp | null | undefined,
  ): boolean => {
    if (dateFilter === "all") return true;

    const deleted = toSafeDate(deletedAt);
    if (!deleted) return false;

    const now = Date.now();
    const diffDays = (now - deleted.getTime()) / (1000 * 60 * 60 * 24);

    switch (dateFilter) {
      case "today":
        return diffDays < 1;
      case "week":
        return diffDays < 7;
      case "month":
        return diffDays < 30;
      default:
        return true;
    }
  };

  const matchesSearch = (item: FolderEntity | CardEntity): boolean => {
    if (!searchQuery.trim()) return true;

    const query = normalizeCaseFold(searchQuery);
    const targetText =
      "folderName" in item
        ? item.folderName
        : item.title || getCardText(item, "question") || "";

    return normalizeCaseFold(targetText).includes(query);
  };

  const filteredFolders = useMemo(() => {
    return deletedFolders.filter(
      (folder) => matchesSearch(folder) && filterByDate(folder.deletedAt),
    );
  }, [deletedFolders, searchQuery, dateFilter]);

  const filteredCards = useMemo(() => {
    return cards.filter(
      (card) => matchesSearch(card) && filterByDate(card.deletedAt),
    );
  }, [cards, searchQuery, dateFilter]);

  const isEmpty = deletedFolders.length === 0 && cards.length === 0;
  const isFilteredEmpty =
    filteredFolders.length === 0 && filteredCards.length === 0;

  const toggleFolder = (id: string): void => {
    setSelectedIds((prev) => ({
      ...prev,
      folders: prev.folders.includes(id)
        ? prev.folders.filter((folderId) => folderId !== id)
        : [...prev.folders, id],
    }));
  };

  const toggleCard = (id: string): void => {
    setSelectedIds((prev) => ({
      ...prev,
      cards: prev.cards.includes(id)
        ? prev.cards.filter((cardId) => cardId !== id)
        : [...prev.cards, id],
    }));
  };

  const selectAll = (): void => {
    setSelectedIds({
      folders: filteredFolders.map((folder) => folder.id),
      cards: filteredCards.map((card) => card.id),
    });
  };

  const clearSelection = (): void => {
    setSelectedIds({ folders: [], cards: [] });
  };

  const handleRestore = async (): Promise<void> => {
    if (!currentUserId) return;

    setIsProcessing(true);

    try {
      const db = await getLocalDb(currentUserId);
      const parentFolderIds = new Set<string>();

      for (const cardId of selectedIds.cards) {
        const card = cards.find((entry) => entry.id === cardId);
        const resolvedFolderId = card
          ? (cardFolderIdByCardId.get(card.id) ?? null)
          : null;

        if (resolvedFolderId) {
          parentFolderIds.add(resolvedFolderId);
        }
      }

      for (const folderId of parentFolderIds) {
        const folder = deletedFolders.find((entry) => entry.id === folderId);
        if (folder?.isDeleted) {
          await restoreFolderWithParents({
            userId: currentUserId,
            folderId,
          });
        }
      }

      for (const id of selectedIds.folders) {
        await db.restore("folders", id);
        await maybeUpdateFirestoreDeletedState({
          pathSegments: folderDocPathSegments(currentUserId, id),
          isDeleted: false,
        });
      }

      for (const id of selectedIds.cards) {
        await db.restore("cards", id);
        await maybeUpdateFirestoreDeletedState({
          pathSegments: cardDocPathSegments(currentUserId, id),
          isDeleted: false,
        });
      }

      setSelectedIds({ folders: [], cards: [] });
      window.alert("復元しました");
    } catch (error) {
      console.error("Failed to restore items:", error);
      window.alert(`復元に失敗しました: ${errorToMessage(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePermanentDelete = async (): Promise<void> => {
    if (!currentUserId) return;

    setIsProcessing(true);

    try {
      const db = await getLocalDb(currentUserId);

      for (const id of selectedIds.folders) {
        await db.purge("folders", id);
        try {
          await maybeDeleteFirestoreDoc(
            folderDocPathSegments(currentUserId, id),
          );
        } catch (error) {
          console.warn(`Firestore delete failed for folder ${id}:`, error);
        }
      }

      for (const id of selectedIds.cards) {
        await db.purge("cards", id);
        try {
          await maybeDeleteFirestoreDoc(cardDocPathSegments(currentUserId, id));
        } catch (error) {
          console.warn(`Firestore delete failed for card ${id}:`, error);
        }
      }

      setSelectedIds({ folders: [], cards: [] });
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete items:", error);
      window.alert("削除に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmptyTrash = (): void => {
    setSelectedIds({
      folders: filteredFolders.map((folder) => folder.id),
      cards: filteredCards.map((card) => card.id),
    });
    setDeleteDialogOpen(true);
  };

  const renderCardRow = (
    card: CardEntity,
    index: number,
    intent: "neutral" | "error" = "neutral",
  ) => {
    const rowClassName =
      intent === "error"
        ? "flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
        : "flex items-center gap-3 p-3 bg-gray-50 rounded-lg ml-8 cursor-pointer hover:bg-gray-100 transition-colors";

    return (
      <div
        key={card.id}
        className={rowClassName}
        onClick={() => setPreviewCard(card)}
      >
        <Checkbox
          checked={selectedIds.cards.includes(card.id)}
          onCheckedChange={() => toggleCard(card.id)}
          onClick={(event) => event.stopPropagation()}
        />
        <FileText
          className={`w-4 h-4 ${intent === "error" ? "text-red-400" : "text-gray-400"}`}
        />
        <div className="flex-1">
          <p className="font-medium text-sm">
            Q{index + 1}:{" "}
            {card.title ||
              getCardText(card, "question").substring(0, 30) ||
              "(無題)"}
          </p>
          <p className="text-xs text-gray-500">
            削除日: {formatDateTime(card.deletedAt)}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen text-slate-800 selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto p-6 md:p-14">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12">
          {!isEmpty && (
            <div className="flex items-center gap-4">
              <Badge
                variant="outline"
                className="h-9 px-4 rounded-xl text-slate-500 bg-white border-slate-200 shadow-sm"
              >
                {deletedFolders.length + cards.length} 件
              </Badge>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleEmptyTrash}
                disabled={isProcessing}
                className="rounded-xl font-bold"
              >
                ごみ箱を空にする
              </Button>
            </div>
          )}
        </div>

        {!isEmpty && (
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="カードやフォルダを検索..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 bg-white shadow-sm transition-all text-slate-700 font-bold placeholder:text-slate-300"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <select
                  value={dateFilter}
                  onChange={(event) =>
                    setDateFilter(
                      event.target.value as "all" | "today" | "week" | "month",
                    )
                  }
                  className="pl-11 pr-8 py-2.5 border border-slate-200 rounded-2xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 shadow-sm appearance-none font-bold text-slate-600 cursor-pointer hover:border-slate-300 transition-all"
                >
                  <option value="all">すべての期間</option>
                  <option value="today">今日</option>
                  <option value="week">過去7日間</option>
                  <option value="month">過去30日間</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {!isEmpty && (searchQuery || dateFilter !== "all") && (
          <div className="mb-4 text-sm text-gray-600">
            {isFilteredEmpty ? (
              <span>条件に一致するアイテムがありません</span>
            ) : (
              <span>
                {filteredFolders.length + filteredCards.length}
                件のアイテムが見つかりました
                {searchQuery && (
                  <span className="ml-1">（「{searchQuery}」で検索）</span>
                )}
              </span>
            )}
          </div>
        )}

        {!isEmpty && (
          <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                すべて選択
              </Button>

              {hasSelection && (
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  選択解除
                </Button>
              )}

              {hasSelection && (
                <span className="text-sm text-gray-500 select-none">
                  {selectedIds.folders.length + selectedIds.cards.length}{" "}
                  件選択中
                </span>
              )}
            </div>

            {hasSelection && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRestore()}
                  disabled={isProcessing}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  復元
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isProcessing}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  完全削除
                </Button>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : isEmpty ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trash2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h2 className="text-xl font-bold mb-2 select-none">
                ごみ箱は空です
              </h2>
              <p className="text-gray-500 select-none">
                削除したフォルダやカードがここに表示されます
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredFolders.map((folder) => {
              const folderCards = allCardsData.filter(
                (card) =>
                  normalizeCaseFold(cardFolderIdByCardId.get(card.id)) ===
                  normalizeCaseFold(folder.id),
              );

              return (
                <Card key={folder.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedIds.folders.includes(folder.id)}
                          onCheckedChange={() => toggleFolder(folder.id)}
                        />
                        <Folder className="w-5 h-5 text-indigo-500" />
                        <div>
                          <CardTitle className="text-base select-none">
                            {folder.folderName}
                          </CardTitle>
                          <p className="text-xs text-gray-500">
                            カード {folderCards.length}枚 | 削除日:{" "}
                            {formatDateTime(folder.deletedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isProcessing || !currentUserId}
                          onClick={async () => {
                            if (!currentUserId) return;

                            setIsProcessing(true);
                            try {
                              await restoreFolderWithParents({
                                userId: currentUserId,
                                folderId: folder.id,
                              });

                              const db = await getLocalDb(currentUserId);
                              for (const card of folderCards) {
                                if (!card.isDeleted) continue;

                                await db.restore("cards", card.id);
                                await maybeUpdateFirestoreDeletedState({
                                  pathSegments: cardDocPathSegments(
                                    currentUserId,
                                    card.id,
                                  ),
                                  isDeleted: false,
                                });
                              }

                              window.alert(
                                `フォルダとカード${folderCards.length}枚を復元しました`,
                              );
                            } catch (error) {
                              console.error("Failed to restore folder:", error);
                              window.alert(
                                `復元に失敗しました: ${errorToMessage(error)}`,
                              );
                            } finally {
                              setIsProcessing(false);
                            }
                          }}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          フォルダごと復元
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {folderCards.length > 0 && (
                    <CardContent>
                      <div className="space-y-2">
                        {folderCards.map((card, index) =>
                          renderCardRow(card, index),
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}

            {Array.from(
              groupCardsByFolderId(
                cards,
                cardFolderIdByCardId,
                deletedFolders,
              ).entries(),
            ).map(([normalizedFolderId, folderCards]) => {
              const folder = folders.find(
                (candidate) =>
                  normalizeCaseFold(candidate.id) === normalizedFolderId,
              );
              if (!folder) return null;

              return (
                <Card key={normalizedFolderId}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Folder className="w-5 h-5 text-gray-400" />
                        <div>
                          <CardTitle className="text-base select-none text-gray-600">
                            {folder.folderName}
                          </CardTitle>
                          <p className="text-xs text-gray-500">
                            削除されたカード {folderCards.length}枚
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isProcessing || !currentUserId}
                        onClick={async () => {
                          if (!currentUserId) return;

                          setIsProcessing(true);
                          try {
                            const db = await getLocalDb(currentUserId);

                            for (const card of folderCards) {
                              await db.restore("cards", card.id);
                              await maybeUpdateFirestoreDeletedState({
                                pathSegments: cardDocPathSegments(
                                  currentUserId,
                                  card.id,
                                ),
                                isDeleted: false,
                              });
                            }

                            window.alert(
                              `${folderCards.length}枚のカードを復元しました`,
                            );
                          } catch (error) {
                            console.error("Failed to restore cards:", error);
                            window.alert("復元に失敗しました");
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        すべて復元
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-2">
                      {folderCards.map((card, index) =>
                        renderCardRow(card, index),
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {cardsWithoutResolvedFolder.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 select-none text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    フォルダなしカード ({cardsWithoutResolvedFolder.length})
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-gray-600 mb-2">
                    これらのカードにはフォルダIDが設定されていません。復元するには手動で修正が必要です。
                  </p>

                  <div className="space-y-2">
                    {cardsWithoutResolvedFolder.map((card, index) =>
                      renderCardRow(card, index, "error"),
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => setDeleteDialogOpen(open)}
        >
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                完全に削除しますか？
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                    <p className="font-medium mb-1">この操作は取り消せません</p>
                    <p>
                      削除されたデータは復元できません。バックアップがない場合、永久に失われます。
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      削除対象:
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {selectedIds.folders.length > 0 && (
                        <li>フォルダ: {selectedIds.folders.length}件</li>
                      )}
                      {selectedIds.cards.length > 0 && (
                        <li>カード: {selectedIds.cards.length}枚</li>
                      )}
                    </ul>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>
                キャンセル
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void handlePermanentDelete()}
                disabled={isProcessing}
                className="bg-red-500 hover:bg-red-600 border-none text-white font-bold"
              >
                {isProcessing ? "削除中..." : "完全に削除"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={Boolean(previewCard)}
          onOpenChange={() => setPreviewCard(null)}
        >
          <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="select-none">
                カードプレビュー
              </AlertDialogTitle>
            </AlertDialogHeader>

            {previewCard && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-gray-700">問題</h3>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="whitespace-pre-wrap">
                      {getCardText(previewCard, "question") || "(問題なし)"}
                    </p>
                    {getCardImages(previewCard, "question").length > 0 && (
                      <div className="mt-3 space-y-2">
                        {getCardImages(previewCard, "question").map(
                          (image, index) => (
                            <img
                              key={index}
                              src={
                                image?.remoteUrl ??
                                image?.localUrl ??
                                image?.url ??
                                String(image)
                              }
                              alt={`Question ${index + 1}`}
                              className="max-w-full rounded"
                            />
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-gray-700">解答</h3>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="whitespace-pre-wrap">
                      {getCardText(previewCard, "answer") || "(解答なし)"}
                    </p>
                    {getCardImages(previewCard, "answer").length > 0 && (
                      <div className="mt-3 space-y-2">
                        {getCardImages(previewCard, "answer").map(
                          (image, index) => (
                            <img
                              key={index}
                              src={
                                image?.remoteUrl ??
                                image?.localUrl ??
                                image?.url ??
                                String(image)
                              }
                              alt={`Answer ${index + 1}`}
                              className="max-w-full rounded"
                            />
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
                  <p>作成日: {formatDateTime(previewCard.createdAt)}</p>
                  <p>削除日: {formatDateTime(previewCard.deletedAt)}</p>
                </div>
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPreviewCard(null)}>
                閉じる
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Trash;
