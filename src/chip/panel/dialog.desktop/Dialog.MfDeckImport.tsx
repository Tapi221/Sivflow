import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/chip/panel/dialog.desktop/dialog/dialog";
import { Button } from "@/chip/ui/button/button";
import { Input } from "@/chip/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/chip/ui/select";
import { useToast } from "@/contexts/ToastContext";
import type { CreateMfDeckCard, CreateMfDeckCardSet, EnsureMfDeckTagByName, UpdateMfDeckCardSet } from "@/features/deckFile/application/importMfDeck";
import { importMfDeckArchive } from "@/features/deckFile/application/importMfDeck";
import { MF_DECK_MIME_TYPE } from "@/features/deckFile/domain/mfDeck.types";
import type { LoadMfDeckFileResult } from "@/features/deckFile/infra/web/readMfDeckFile";
import { readMfDeckFile } from "@/features/deckFile/infra/web/readMfDeckFile";
import type { CardSet } from "@/types";



type MfDeckImportCompletedPayload = {
  cardSetId: string;
  cardSetName: string;
  folderId: string;
  createdCount: number;
};
type MfDeckImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string | null;
  folderName?: string | null;
  cardSets: CardSet[];
  onImported?: (payload: MfDeckImportCompletedPayload) => void;
  createCardSet: CreateMfDeckCardSet;
  updateCardSet?: UpdateMfDeckCardSet;
  createCard: CreateMfDeckCard;
  ensureTagByName?: EnsureMfDeckTagByName;
  initialFile?: File | null;
  initialFileRevision?: number;
};
type DestinationMode = "new" | "existing";



const emptyLoadedState = {
  file: null as File | null,
  loaded: null as LoadMfDeckFileResult | null,
};
const EMPTY_ISSUES: LoadMfDeckFileResult["issues"] = [];



const MfDeckImportDialog = ({ open, onOpenChange, folderId, folderName, cardSets, onImported, createCardSet, updateCardSet, createCard, ensureTagByName, initialFile = null, initialFileRevision = 0 }: MfDeckImportDialogProps) => {
  const toast = useToast();
  const [destinationMode, setDestinationMode] = useState<DestinationMode>("new");
  const [newCardSetName, setNewCardSetName] = useState("");
  const [selectedCardSetId, setSelectedCardSetId] = useState("");
  const [state, setState] = useState(emptyLoadedState);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const archive = state.loaded?.archive ?? null;
  const issues = state.loaded?.issues ?? EMPTY_ISSUES;
  const previewCards = archive?.cardsJson.cards.slice(0, 8) ?? [];
  const cardCount = archive?.cardsJson.cards.length ?? 0;
  const selectedExistingCardSet = useMemo(() => cardSets.find((cardSet) => cardSet.id === selectedCardSetId) ?? null, [cardSets, selectedCardSetId]);
  const issueSummary = useMemo(() => ({
    errorCount: issues.filter((issue) => issue.level === "error").length,
    warningCount: issues.filter((issue) => issue.level === "warning").length,
  }), [issues]);
  const resetState = () => {
    setState(emptyLoadedState);
    setIsParsing(false);
    setIsImporting(false);
    setDestinationMode("new");
    setNewCardSetName("");
    setSelectedCardSetId(cardSets[0]?.id ?? "");
  };
  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) resetState();
    onOpenChange(nextOpen);
  };
  const loadFile = useCallback(async (file: File) => {
    setIsParsing(true);
    try {
      const loaded = await readMfDeckFile(file);
      setState({ file, loaded });
      setNewCardSetName((current) => current.trim() || loaded.suggestedCardSetName);
    } catch (error) {
      console.error("[MfDeckImportDialog] parse failed", error);
      toast.error("MFDeck の解析に失敗しました。ファイル形式を確認してください。");
      setState({ file, loaded: { file, archive: null, suggestedCardSetName: file.name, issues: [{ level: "error", code: "invalid_zip", message: "MFDeck の解析に失敗しました。" }] } });
    } finally {
      setIsParsing(false);
    }
  }, [toast]);
  useEffect(() => {
    if (!open) return;
    if (cardSets.length === 0) {
      setDestinationMode("new");
      setSelectedCardSetId("");
      return;
    }
    if (!selectedCardSetId || !cardSets.some((cardSet) => cardSet.id === selectedCardSetId)) setSelectedCardSetId(cardSets[0].id);
  }, [cardSets, open, selectedCardSetId]);
  useEffect(() => {
    if (!open || !initialFile) return;
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
    if (!archive) {
      toast.error("先に有効な .mfdeck ファイルを読み込んでください。");
      return;
    }
    if (issueSummary.errorCount > 0) {
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
    setIsImporting(true);
    try {
      const imported = await importMfDeckArchive({
        archive,
        folderId,
        createCardSet,
        updateCardSet,
        createCard,
        ensureTagByName,
        destination: destinationMode === "existing" && selectedExistingCardSet ? { kind: "existing-card-set", cardSetId: selectedExistingCardSet.id, cardSetName: selectedExistingCardSet.name } : { kind: "new-card-set", cardSetName: newCardSetName },
      });
      toast.success(`${imported.createdCount} 件のカードをインポートしました。`);
      if (imported.issues.length > 0) toast.warning(`${imported.issues.length} 件の警告があります。タグなど一部の情報を確認してください。`);
      handleClose(false);
      onImported?.({ cardSetId: imported.createdCardSetId, cardSetName: imported.createdCardSetName, folderId: imported.folderId, createdCount: imported.createdCount });
    } catch (error) {
      console.error("[MfDeckImportDialog] import failed", error);
      toast.error("MFDeck のインポート中にエラーが発生しました。");
    } finally {
      setIsImporting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>MFDeck インポート</DialogTitle>
          <DialogDescription>{folderName ? `インポート先: ${folderName}` : "選択中のフォルダに .mfdeck のカードセットを追加します。"}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-sm font-medium text-slate-800">MFDeck ファイルを選択</p>
            <Input type="file" accept={`.mfdeck,${MF_DECK_MIME_TYPE},application/zip`} onChange={handleFileChange} disabled={isParsing || isImporting} />
            <Select value={destinationMode} onValueChange={(value) => {
              if (value === "existing" && cardSets.length === 0) return;
              setDestinationMode(value as DestinationMode);
            }}
            >
              <SelectTrigger><SelectValue placeholder="取り込み先を選択" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">新規カードセットを作成</SelectItem>
                <SelectItem value="existing" disabled={cardSets.length === 0}>既存カードセットへ追加</SelectItem>
              </SelectContent>
            </Select>
            {destinationMode === "new" ? <Input value={newCardSetName} onChange={(event) => setNewCardSetName(event.target.value)} placeholder="新規カードセット名" disabled={isParsing || isImporting} /> : null}
            {destinationMode === "existing" ? (
              <Select value={selectedCardSetId} onValueChange={setSelectedCardSetId} disabled={cardSets.length === 0}>
                <SelectTrigger><SelectValue placeholder="追加先カードセットを選択" /></SelectTrigger>
                <SelectContent>{cardSets.map((cardSet) => <SelectItem key={cardSet.id} value={cardSet.id}>{cardSet.name?.trim() ?? "無題のカードセット"}</SelectItem>)}</SelectContent>
              </Select>
            ) : null}
            <p className="text-xs leading-relaxed text-slate-500">v1 ではカード本文・数式・コード・タグ名を取り込みます。復習履歴は共有データに含めず、取り込み先の環境で新規カードとして扱います。</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs text-slate-500">ファイル</p><p className="mt-1 text-sm font-medium text-slate-800">{state.file?.name ?? "未選択"}</p></div>
            <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs text-slate-500">カード数</p><p className="mt-1 text-sm font-medium text-slate-800">{cardCount}</p></div>
            <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs text-slate-500">デッキ名</p><p className="mt-1 text-sm font-medium text-slate-800">{archive?.manifest.deck.name ?? "未読込"}</p></div>
            <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs text-slate-500">Issues</p><p className="mt-1 text-sm font-medium text-slate-800">error {issueSummary.errorCount} / warning {issueSummary.warningCount}</p></div>
          </div>
          <div className="rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-800">プレビュー</div>
            <div className="max-h-72 overflow-auto px-4 py-3">
              {previewCards.length === 0 ? <p className="text-sm text-slate-500">まだプレビューできるデータがありません。</p> : <div className="space-y-3">{previewCards.map((card) => <div key={card.id} className="rounded-lg border border-slate-200 p-3"><p className="text-sm font-medium text-slate-800">{card.title?.trim() || card.questionNumber || card.id}</p><p className="mt-1 text-xs text-slate-500">front {card.front.blocks.length} blocks / back {card.back.blocks.length} blocks</p></div>)}</div>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>閉じる</Button>
          <Button onClick={handleImport} disabled={isParsing || isImporting || !archive || issueSummary.errorCount > 0 || (destinationMode === "new" && newCardSetName.trim() === "")}>{isImporting ? "インポート中..." : destinationMode === "existing" ? "既存セットへ追加する" : "インポートする"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};



export { MfDeckImportDialog };


export type { MfDeckImportCompletedPayload, MfDeckImportDialogProps };
