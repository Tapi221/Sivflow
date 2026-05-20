import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { importMfCardFile } from "@/features/cardFile/application/importMfCard";
import { MF_CARD_MIME_TYPE } from "@/features/cardFile/domain/mfCardTypes";
import {
  type LoadMfCardFileResult,
  readMfCardFile,
} from "@/features/cardFile/infra/web/readMfCardFile";
import type {
  CreateMfDeckCard,
  CreateMfDeckCardSet,
  EnsureMfDeckTagByName,
  UpdateMfDeckCardSet,
} from "@/features/deckFile/application/importMfDeck";

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
import type { CardSet } from "@/types";

export type MfCardImportCompletedPayload = {
  cardSetId: string;
  cardSetName: string;
  folderId: string;
  createdCount: number;
};

type MfCardImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string | null;
  folderName?: string | null;
  cardSets: CardSet[];
  onImported?: (payload: MfCardImportCompletedPayload) => void;
  createCardSet: CreateMfDeckCardSet;
  updateCardSet?: UpdateMfDeckCardSet;
  createCard: CreateMfDeckCard;
  ensureTagByName?: EnsureMfDeckTagByName;
  initialFile?: File | null;
  initialFileRevision?: number;
};

const emptyLoadedState = {
  file: null as File | null,
  loaded: null as LoadMfCardFileResult | null,
};

export const MfCardImportDialog = ({
  open,
  onOpenChange,
  folderId,
  folderName,
  cardSets,
  onImported,
  createCardSet,
  updateCardSet,
  createCard,
  ensureTagByName,
  initialFile = null,
  initialFileRevision = 0,
}: MfCardImportDialogProps) => {
  const toast = useToast();
  const [destinationMode, setDestinationMode] = useState<"new" | "existing">(
    "new",
  );
  const [newCardSetName, setNewCardSetName] = useState("");
  const [selectedCardSetId, setSelectedCardSetId] = useState("");
  const [state, setState] = useState(emptyLoadedState);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const selectedExistingCardSet = useMemo(() => {
    return cardSets.find((cardSet) => cardSet.id === selectedCardSetId) ?? null;
  }, [cardSets, selectedCardSetId]);

  const issueSummary = useMemo(() => {
    const issues = state.loaded?.issues ?? [];
    return {
      errorCount: issues.filter((issue) => issue.level === "error").length,
      warningCount: issues.filter((issue) => issue.level === "warning").length,
    };
  }, [state.loaded]);

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
      setState(emptyLoadedState);
      setIsParsing(false);
      setIsImporting(false);
      setDestinationMode("new");
      setNewCardSetName("");
      setSelectedCardSetId(cardSets[0]?.id ?? "");
    }

    onOpenChange(nextOpen);
  };

  const loadFile = useCallback(
    async (file: File) => {
      setIsParsing(true);

      try {
        const loaded = await readMfCardFile(file);

        setState({
          file: loaded.file,
          loaded,
        });
        setNewCardSetName((current) => {
          return current.trim() || loaded.suggestedCardSetName;
        });
      } catch (error) {
        console.error("[MfCardImportDialog] parse failed", error);
        toast.error(
          "MFCard の解析に失敗しました。ファイル形式を確認してください。",
        );
        setState({ file, loaded: null });
      } finally {
        setIsParsing(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    if (!open || !initialFile) {
      return;
    }

    void loadFile(initialFile);
  }, [initialFile, initialFileRevision, loadFile, open]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setState(emptyLoadedState);
      return;
    }

    await loadFile(file);
    event.target.value = "";
  };

  const handleImport = async () => {
    if (!folderId) {
      toast.error("インポート先フォルダが選択されていません。");
      return;
    }

    if (!state.loaded) {
      toast.error("先に有効な MFCard ファイルを読み込んでください。");
      return;
    }

    const destination = (() => {
      if (destinationMode === "existing") {
        if (!selectedExistingCardSet) {
          return null;
        }

        return {
          kind: "existing-card-set" as const,
          cardSetId: selectedExistingCardSet.id,
          cardSetName: selectedExistingCardSet.name,
        };
      }

      const cardSetName = newCardSetName.trim();
      if (!cardSetName) {
        return null;
      }

      return {
        kind: "new-card-set" as const,
        cardSetName,
      };
    })();

    if (!destination) {
      toast.error(
        destinationMode === "existing"
          ? "追加先のカードセットを選択してください。"
          : "新規カードセット名を入力してください。",
      );
      return;
    }

    setIsImporting(true);

    try {
      const imported = await importMfCardFile({
        cardFile: state.loaded.cardFile,
        folderId,
        createCardSet,
        updateCardSet,
        createCard,
        ensureTagByName,
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
      console.error("[MfCardImportDialog] import failed", error);
      toast.error("MFCard のインポート中にエラーが発生しました。");
    } finally {
      setIsImporting(false);
    }
  };

  const card = state.loaded?.cardFile.card ?? null;
  const importButtonLabel =
    destinationMode === "existing" ? "既存セットへ追加する" : "インポートする";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>MFCard インポート</DialogTitle>
          <DialogDescription>
            {folderName
              ? `インポート先: ${folderName}`
              : "選択中のフォルダに単体カードを追加します。"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="grid gap-3">
              <p className="text-sm font-medium text-slate-800">
                .mfcard ファイルを選択
              </p>

              <div className="grid gap-2">
                <p className="text-sm font-medium text-slate-800">取り込み先</p>
                <Select
                  value={destinationMode}
                  onValueChange={(value) => {
                    if (value === "existing" && cardSets.length === 0) return;
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
              </div>

              <Input
                type="file"
                accept={`.mfcard,${MF_CARD_MIME_TYPE},application/json`}
                onChange={handleFileChange}
                disabled={isParsing || isImporting}
              />

              <p className="text-xs leading-relaxed text-slate-500">
                MFCard
                は単体カードの共有形式です。復習履歴や同期状態は取り込みません。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-500">ファイル</p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {state.file?.name ?? "未選択"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-500">カード</p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {card?.title?.trim() || card?.questionNumber || "未読み込み"}
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

          <div className="rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-800">
              プレビュー
            </div>
            <div className="px-4 py-3">
              {!card ? (
                <p className="text-sm text-slate-500">
                  まだプレビューできるデータがありません。
                </p>
              ) : (
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-800">
                    {card.title?.trim() || card.questionNumber || card.id}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    front {card.front.blocks.length} blocks / back{" "}
                    {card.back.blocks.length} blocks
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(card.tagNames ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
              !state.loaded ||
              (destinationMode === "new" && newCardSetName.trim() === "") ||
              (destinationMode === "existing" && !selectedExistingCardSet)
            }
          >
            {isImporting ? "インポート中..." : importButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
