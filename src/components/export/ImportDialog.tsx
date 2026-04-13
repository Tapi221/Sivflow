import React, { useEffect, useState, useRef } from "react";
import { useAuthSession } from "@/contexts/AuthContext";
import {
  getLocalDb,
  getLocalDBRuntimeStatus,
  subscribeLocalDBRuntimeStatus,
} from "@/services/localDB";
import { snapshotService } from "@/services/SnapshotService";
import { toAssetRecordFromSnapshotAsset } from "@/application/snapshot/snapshotAssetManifest";
import type { AppSnapshot, SnapshotComparison } from "@/types/domain/snapshot";
import type { Card, Folder } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, ArrowRight, AlertTriangle } from "@/ui/icons";
import { Upload } from "@/ui/icons";
import { FileJson } from "@/ui/icons";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = "select" | "preview" | "confirm" | "processing" | "complete";
type ImportAction = "replace" | "keep" | "cancel";

const normalizeImportedCard = (card: Card, userId: string): Card => ({
  ...card,
  userId,
});

const normalizeImportedFolder = (folder: Folder, userId: string): Folder => ({
  ...folder,
  userId,
});

const normalizeImportedCardSet = (
  cardSet: CardSet,
  userId: string,
): CardSet => ({
  ...cardSet,
  userId,
});

const ImportDialog = ({ open, onOpenChange }: ImportDialogProps) => {
  const { currentUser } = useAuthSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>("select");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedSnapshot, setParsedSnapshot] = useState<AppSnapshot | null>(
    null,
  );
  const [comparison, setComparison] = useState<SnapshotComparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importAction, setImportAction] = useState<ImportAction>("keep");
  const [runtimeStatus, setRuntimeStatus] = useState(getLocalDBRuntimeStatus());

  useEffect(() => {
    const unsubscribe = subscribeLocalDBRuntimeStatus(setRuntimeStatus);
    return () => {
      void unsubscribe();
    };
  }, []);

  const isFallbackMode = runtimeStatus.mode === "fallback";

  const resetState = () => {
    setStep("select");
    setSelectedFile(null);
    setParsedSnapshot(null);
    setComparison(null);
    setError(null);
    setImportAction("keep");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFallbackMode) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);

    try {
      const snapshot = await snapshotService.parseSnapshotFile(file);
      setParsedSnapshot(snapshot);

      if (currentUser) {
        const comp = await snapshotService.compareWithLocal(
          snapshot,
          currentUser.uid,
        );
        setComparison(comp);
      }

      setStep("preview");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "ファイルの読み込みに失敗しました";
      setError(message);
    }
  };

  const handleImport = async () => {
    if (
      isFallbackMode ||
      !parsedSnapshot ||
      !currentUser ||
      importAction === "cancel"
    ) {
      onOpenChange(false);
      resetState();
      return;
    }

    if (importAction === "keep") {
      onOpenChange(false);
      resetState();
      return;
    }

    // replace: インポートしたデータで上書き
    setStep("processing");

    try {
      // 全データをクリアして新しいデータをインポート
      // 注意: これは危険な操作なので、事前にバックアップを推奨
      const db = await getLocalDb(currentUser.uid);
      const imagesTable = db.table("images");
      const cardSetsTable = db.table("cardSets");
      const cardsTable = db.table("cards");
      const foldersTable = db.table("folders");
      const normalizedCards = parsedSnapshot.data.cards.map((card) =>
        normalizeImportedCard(card, currentUser.uid),
      );
      const normalizedCardSets = parsedSnapshot.data.cardSets.map((cardSet) =>
        normalizeImportedCardSet(cardSet, currentUser.uid),
      );
      const normalizedFolders = parsedSnapshot.data.folders.map((folder) =>
        normalizeImportedFolder(folder, currentUser.uid),
      );
      const assetRows = parsedSnapshot.data.assets.map((asset) =>
        toAssetRecordFromSnapshotAsset(asset, currentUser.uid),
      );

      await db.transaction(
        "rw",
        imagesTable,
        cardSetsTable,
        cardsTable,
        foldersTable,
        async () => {
          await imagesTable.clear();
          await cardSetsTable.clear();
          await cardsTable.clear();
          await foldersTable.clear();

          if (assetRows.length > 0) {
            await imagesTable.bulkPut(assetRows);
          }

          if (normalizedCardSets.length > 0) {
            await cardSetsTable.bulkPut(normalizedCardSets);
          }

          if (normalizedFolders.length > 0) {
            await foldersTable.bulkPut(normalizedFolders);
          }

          if (normalizedCards.length > 0) {
            await cardsTable.bulkPut(normalizedCards);
          }
        },
      );

      setStep("complete");

      setTimeout(() => {
        onOpenChange(false);
        resetState();
        window.location.reload(); // データを反映するためにリロード
      }, 2000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "インポートに失敗しました";
      setError(message);
      setStep("preview");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetState();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary-600" />
            データインポート
          </DialogTitle>
          <DialogDescription>
            以前エクスポートしたJSONファイルからデータを復元します。
          </DialogDescription>
        </DialogHeader>

        {/* Step: Select File */}
        {step === "select" && (
          <div className="py-6">
            {isFallbackMode && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertTriangle className="mr-1 inline h-4 w-4" />
                ローカル保存が無効なため、このセッションではインポートできません。
              </div>
            )}
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              ref={fileInputRef}
              className="hidden"
              disabled={isFallbackMode}
            />

            <div
              onClick={() => {
                if (!isFallbackMode) fileInputRef.current?.click();
              }}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isFallbackMode
                  ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-70"
                  : "cursor-pointer border-gray-300 hover:border-primary-600 hover:bg-gray-50"
              }`}
            >
              <FileJson className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">
                クリックしてJSONファイルを選択
              </p>
              <p className="text-xs text-gray-500 mt-1">
                または、ファイルをドラッグ＆ドロップ
              </p>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && parsedSnapshot && comparison && (
          <div className="py-4 space-y-4">
            {/* ファイル情報 */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">選択したファイル</p>
              <p className="text-sm font-medium">{selectedFile?.name}</p>
            </div>

            {/* 比較結果 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-xs text-blue-600 font-medium">
                    インポートファイル
                  </p>
                  <p className="text-sm leading-6">
                    カード: {parsedSnapshot.data.cards.length}枚 / フォルダ:{" "}
                    {parsedSnapshot.data.folders.length}件 / カードセット:{" "}
                    {parsedSnapshot.data.cardSets.length}件
                    <br />
                    画像アセット: {parsedSnapshot.data.assets.length}件
                  </p>
                  <p className="text-xs text-gray-500 leading-5">
                    世代: {comparison.importedGeneration}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
                <div className="text-right">
                  <p className="text-xs text-green-600 font-medium">
                    現在のデータ
                  </p>
                  <p className="text-sm">世代: {comparison.localGeneration}</p>
                </div>
              </div>

              {comparison.newerSnapshot === "imported" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  インポートファイルの方が新しいデータです
                </div>
              )}

              {comparison.newerSnapshot === "local" && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  現在のデータの方が新しいです
                </div>
              )}

              {(comparison.diff.assetsAdded > 0 ||
                comparison.diff.assetsRemoved > 0) && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  画像差分: +{comparison.diff.assetsAdded} / -
                  {comparison.diff.assetsRemoved}
                </div>
              )}

              {(comparison.diff.cardSetsAdded > 0 ||
                comparison.diff.cardSetsRemoved > 0) && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  カードセット差分: +{comparison.diff.cardSetsAdded} / -
                  {comparison.diff.cardSetsRemoved}
                </div>
              )}

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
                replace は cards / cardSets / folders / images を全置換します
              </div>
            </div>

            {/* アクション選択 */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                どうしますか？
              </p>
              <RadioGroup
                value={importAction}
                onValueChange={(v) => setImportAction(v as ImportAction)}
              >
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="replace" id="replace" />
                  <Label htmlFor="replace" className="flex-1 cursor-pointer">
                    <span className="font-medium text-red-600">上書きする</span>
                    <p className="text-xs text-gray-500">
                      現在のデータを破棄してインポート
                    </p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="keep" id="keep" />
                  <Label htmlFor="keep" className="flex-1 cursor-pointer">
                    <span className="font-medium">現在のデータを保持</span>
                    <p className="text-xs text-gray-500">
                      インポートをキャンセル
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {importAction === "replace" && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                <strong>警告:</strong>{" "}
                現在のデータは上書きされます。事前にバックアップを取ることをお勧めします。
              </div>
            )}
          </div>
        )}

        {/* Step: Processing */}
        {step === "processing" && (
          <div className="py-8 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary-600 animate-spin" />
            <p className="text-sm text-gray-600">インポート中...</p>
          </div>
        )}

        {/* Step: Complete */}
        {step === "complete" && (
          <div className="py-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium text-gray-900">
              インポート完了！
            </p>
            <p className="text-sm text-gray-500 mt-1">
              ページをリロードしています...
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "select" && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  resetState();
                }}
              >
                戻る
              </Button>
              <Button
                onClick={handleImport}
                disabled={isFallbackMode}
                className={
                  importAction === "replace"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-primary-600 hover:bg-primary-700"
                }
              >
                {importAction === "replace" ? "上書きインポート" : "閉じる"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportDialog;
