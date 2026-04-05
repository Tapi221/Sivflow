import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/contexts/ToastContext";
import {
  buildImportCardSetName,
  importCardsFromPayload,
} from "@/features/import/importCardsFromPayload";
import {
  formatImportCellLabel,
  hasImportBlockingError,
  type ImportParseResult,
} from "@/features/import/types";
import { downloadXlsxImportTemplate } from "@/features/import/xlsx/downloadXlsxImportTemplate";
import { parseXlsxImport } from "@/features/import/xlsx/parseXlsxImport";
import type { Card, CardSet } from "@/types";

type CreateCardSet = (
  name: string,
  targetFolderId?: string | null,
  opts?: {
    description?: string;
    id?: string;
    orderIndex?: number;
  },
) => Promise<CardSet>;

type CreateCard = (
  cardData: Partial<Card> & { cardSetId?: string },
) => Promise<Card>;

export type XlsxImportCompletedPayload = {
  cardSetId: string;
  cardSetName: string;
  folderId: string;
  createdCount: number;
};

type XlsxImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string | null;
  folderName?: string | null;
  cardSets: CardSet[];
  onImported?: (payload: XlsxImportCompletedPayload) => void;
  createCardSet: CreateCardSet;
  createCard: CreateCard;
};
const emptyState = {
  file: null as File | null,
  result: null as ImportParseResult | null,
};

export const XlsxImportDialog = ({
  open,
  onOpenChange,
  folderId,
  folderName,
  cardSets,
  onImported,
  createCardSet,
  createCard,
}: XlsxImportDialogProps) => {
  const toast = useToast();
  const [destinationMode, setDestinationMode] = useState<"new" | "existing">(
    "new",
  );
  const [newCardSetName, setNewCardSetName] = useState("");
  const [selectedCardSetId, setSelectedCardSetId] = useState("");
  const [state, setState] = useState(emptyState);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const issueSummary = useMemo(() => {
    const issues = state.result?.issues ?? [];
    return {
      errorCount: issues.filter((issue) => issue.level === "error").length,
      warningCount: issues.filter((issue) => issue.level === "warning").length,
    };
  }, [state.result]);

  const selectedExistingCardSet = useMemo(() => {
    return cardSets.find((cardSet) => cardSet.id === selectedCardSetId) ?? null;
  }, [cardSets, selectedCardSetId]);

  useEffect(() => {
    if (!open) return;

    if (cardSets.length === 0) {
      setDestinationMode("new");
      setSelectedCardSetId("");
      return;
    }

    if (
      !selectedCardSetId ||
      !cardSets.some((cardSet) => cardSet.id === selectedCardSetId)
    ) {
      setSelectedCardSetId(cardSets[0].id);
    }
  }, [cardSets, open, selectedCardSetId]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setState(emptyState);
      setIsParsing(false);
      setIsImporting(false);
      setDestinationMode("new");
      setNewCardSetName("");
      setSelectedCardSetId(cardSets[0]?.id ?? "");
    }

    onOpenChange(nextOpen);
  };

  const handleDownloadTemplate = () => {
    downloadXlsxImportTemplate();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setState(emptyState);
      return;
    }

    setIsParsing(true);

    try {
      const fileBuffer = await file.arrayBuffer();
      const result = await parseXlsxImport(fileBuffer);

      setState({
        file,
        result,
      });
      setNewCardSetName((current) => {
        return current.trim() || buildImportCardSetName(file.name);
      });
    } catch (error) {
      console.error("[XlsxImportDialog] parse failed", error);
      toast.error(
        "XLSX の解析に失敗しました。ファイル形式を確認してください。",
      );
      setState({
        file,
        result: null,
      });
    } finally {
      setIsParsing(false);
      event.target.value = "";
    }
  };

  const handleImport = async () => {
    if (!folderId) {
      toast.error("インポート先フォルダが選択されていません。");
      return;
    }

    if (!state.file || !state.result?.payload) {
      toast.error("先に有効な XLSX ファイルを読み込んでください。");
      return;
    }

    if (hasImportBlockingError(state.result)) {
      toast.error("エラーが残っているためインポートできません。");
      return;
    }

    if (destinationMode === "new" && newCardSetName.trim() === "") {
      toast.error("新規カードセット名を入力してください。");
      return;
    }

    if (destinationMode === "existing" && !selectedExistingCardSet) {
      toast.error("追加先のカードセットを選択してください。");
      return;
    }

    const destination =
      destinationMode === "existing" && selectedExistingCardSet
        ? {
            kind: "existing-card-set" as const,
            cardSetId: selectedExistingCardSet.id,
            cardSetName: selectedExistingCardSet.name,
          }
        : {
            kind: "new-card-set" as const,
            cardSetName: newCardSetName.trim(),
          };

    setIsImporting(true);

    try {
      const imported = await importCardsFromPayload({
        payload: state.result.payload,
        folderId,
        fileName: state.file.name,
        createCardSet,
        createCard,
        destination,
      });

      toast.success(
        `${imported.createdCount} 件のカードをインポートしました。`,
      );
      handleClose(false);
      onImported?.({
        cardSetId: imported.createdCardSetId,
        cardSetName: imported.createdCardSetName,
        folderId: imported.folderId,
        createdCount: imported.createdCount,
      });
    } catch (error) {
      console.error("[XlsxImportDialog] import failed", error);
      toast.error("インポート中にエラーが発生しました。");
    } finally {
      setIsImporting(false);
    }
  };

  const previewCards = state.result?.payload?.cards.slice(0, 8) ?? [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>一括インポート</DialogTitle>
          <DialogDescription>
            {folderName
              ? `インポート先: ${folderName}`
              : "選択中のフォルダにカードをまとめて追加します。"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-800">
                  XLSX テンプレートを選択
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  disabled={isParsing || isImporting}
                >
                  テンプレートをダウンロード
                </Button>
              </div>

              <div className="grid gap-2">
                <p className="text-sm font-medium text-slate-800">取り込み先</p>
                <Select
                  value={destinationMode}
                  onValueChange={(value) => {
                    if (value === "existing" && cardSets.length === 0) {
                      return;
                    }
                    setDestinationMode(value as "new" | "existing");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="取り込み先を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">新規カードセットを作成</SelectItem>
                    <SelectItem
                      value="existing"
                      disabled={cardSets.length === 0}
                    >
                      既存カードセットへ追加
                    </SelectItem>
                  </SelectContent>
                </Select>

                {destinationMode === "new" ? (
                  <Input
                    value={newCardSetName}
                    onChange={(event) => setNewCardSetName(event.target.value)}
                    placeholder="新規カードセット名"
                    disabled={isParsing || isImporting}
                  />
                ) : null}

                {destinationMode === "existing" ? (
                  <Select
                    value={selectedCardSetId}
                    onValueChange={setSelectedCardSetId}
                    disabled={cardSets.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="追加先カードセットを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {cardSets.map((cardSet) => (
                        <SelectItem key={cardSet.id} value={cardSet.id}>
                          {cardSet.name?.trim() || "無題のカードセット"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}

                {destinationMode === "existing" && cardSets.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    このフォルダには既存カードセットがありません。
                  </p>
                ) : null}
              </div>

              <Input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileChange}
                disabled={isParsing || isImporting}
              />

              <div className="grid gap-1 text-xs text-slate-500">
                <p>
                  phase 1 では text / markdown / math / code のみ取り込みます。
                  image 行はエラーとして止めます。
                </p>
                <p>
                  blocks シートで cardId が同じ行は 1
                  枚のカードとしてまとめられ、 side ごとに front / back
                  へ振り分けられます。side 未指定なら front 扱いです。
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-500">ファイル</p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {state.file?.name ?? "未選択"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-500">カード数</p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {state.result?.payload?.cards.length ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-500">取り込み先</p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {destinationMode === "existing"
                  ? selectedExistingCardSet?.name?.trim() || "未選択"
                  : newCardSetName.trim() || "未入力"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Issues</p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                error {issueSummary.errorCount} / warning{" "}
                {issueSummary.warningCount}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-800">
                プレビュー
              </div>
              <div className="max-h-72 overflow-auto px-4 py-3">
                {previewCards.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    まだプレビューできるデータがありません。
                  </p>
                ) : (
                  <div className="space-y-3">
                    {previewCards.map((card) => (
                      <div
                        key={card.cardId}
                        className="rounded-lg border border-slate-200 p-3"
                      >
                        <p className="text-sm font-medium text-slate-800">
                          {card.title?.trim() || card.cardId}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          front {card.frontBlocks.length} blocks / back{" "}
                          {card.backBlocks.length} blocks
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {card.frontBlocks.map((block) => (
                            <span
                              key={`${card.cardId}-front-${block.order}-${block.type}`}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700"
                            >
                              F{block.order}. {block.type}
                            </span>
                          ))}
                          {card.backBlocks.map((block) => (
                            <span
                              key={`${card.cardId}-back-${block.order}-${block.type}`}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700"
                            >
                              B{block.order}. {block.type}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-800">
                Issues
              </div>
              <div className="max-h-72 overflow-auto px-4 py-3">
                {(state.result?.issues ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">issue はありません。</p>
                ) : (
                  <div className="space-y-2">
                    {state.result?.issues.map((issue, index) => (
                      <div
                        key={`${issue.code}-${issue.rowNumber ?? "header"}-${index}`}
                        className="rounded-lg border border-slate-200 p-3"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {issue.level} · {formatImportCellLabel(issue)}
                        </p>
                        <p className="mt-1 text-sm text-slate-800">
                          {issue.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            閉じる
          </Button>
          <Button
            onClick={handleImport}
            disabled={
              isParsing ||
              isImporting ||
              !state.result?.payload ||
              (destinationMode === "new" && newCardSetName.trim() === "") ||
              hasImportBlockingError(state.result)
            }
          >
            {isImporting
              ? "インポート中..."
              : destinationMode === "existing"
                ? "既存セットへ追加する"
                : "インポートする"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
