import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  HardDrive,
  Merge,
} from "@/ui/icons";
import { useAuth } from "@/contexts/AuthContext";
import type { SyncConflict } from "@/types";

interface ConflictResolutionDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 競合解決ダイアログ
 * - 未解決の競合を一件ずつ表示
 * - autoMerged フィールドはグレー表示（自動マージ済み）
 * - conflicts フィールドは2カラム差分表示
 * - 3つの解決ボタン: ローカル採用、クラウド採用、フィールド選択
 */
export function ConflictResolutionDialog({
  open,
  onClose,
}: ConflictResolutionDialogProps) {
  const { syncService, triggerSync } = useAuth();
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fieldSelections, setFieldSelections] = useState<
    Record<string, "local" | "remote">
  >({});
  const [resolving, setResolving] = useState(false);

  const loadConflicts = useCallback(async () => {
    if (!syncService) return;
    try {
      const allConflicts = await syncService.getUnresolvedConflicts();
      setConflicts(allConflicts);
      setCurrentIndex(0);
      setFieldSelections({});
    } catch (error) {
      console.error("Failed to load conflicts:", error);
    }
  }, [syncService]);

  useEffect(() => {
    if (open) {
      loadConflicts();
    }
  }, [open, loadConflicts]);

  const currentConflict = conflicts[currentIndex];

  const handleResolveLocal = async () => {
    if (!currentConflict || !syncService) return;

    setResolving(true);
    try {
      const resolved = {
        ...currentConflict.autoMerged,
        ...Object.fromEntries(
          Object.entries(currentConflict.conflicts).map(([key, value]) => [
            key,
            value.local,
          ]),
        ),
        updatedAt: new Date(),
      };

      await syncService.resolveConflict(currentConflict.id, resolved);
      await moveToNextOrClose();
    } finally {
      setResolving(false);
    }
  };

  const handleResolveRemote = async () => {
    if (!currentConflict || !syncService) return;

    setResolving(true);
    try {
      const resolved = {
        ...currentConflict.autoMerged,
        ...Object.fromEntries(
          Object.entries(currentConflict.conflicts).map(([key, value]) => [
            key,
            value.remote,
          ]),
        ),
        updatedAt: new Date(),
      };

      await syncService.resolveConflict(currentConflict.id, resolved);
      await moveToNextOrClose();
    } finally {
      setResolving(false);
    }
  };

  const handleResolveFields = async () => {
    if (!currentConflict || !syncService) return;

    setResolving(true);
    try {
      const resolved = {
        ...currentConflict.autoMerged,
        ...Object.fromEntries(
          Object.entries(currentConflict.conflicts).map(([key, value]) => {
            const selection = fieldSelections[key] || "local";
            return [key, value[selection]];
          }),
        ),
        updatedAt: new Date(),
      };

      await syncService.resolveConflict(currentConflict.id, resolved);
      await moveToNextOrClose();
    } finally {
      setResolving(false);
    }
  };

  const moveToNextOrClose = async () => {
    if (currentIndex < conflicts.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setFieldSelections({});
    } else {
      await triggerSync();
      onClose();
    }
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return "(空)";
    }
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const truncateValue = (value: string, maxLength: number = 200): string => {
    if (value.length <= maxLength) return value;
    return value.substring(0, maxLength) + "...";
  };

  const getFieldLabel = (key: string): string => {
    const labels: Record<string, string> = {
      questionText: "問題文",
      answerText: "解答",
      title: "タイトル",
      name: "名前",
      description: "説明",
      level: "レベル",
      nextReviewDate: "次回復習日",
      hasUncertainty: "不確実フラグ",
      isCompleted: "完了フラグ",
      isSilent: "サイレントフラグ",
      orderIndex: "順序",
      questionNumber: "問題番号",
    };
    return labels[key] || key;
  };

  if (!currentConflict) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              競合なし
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <AlertTriangle className="w-12 h-12 mb-4 opacity-50" />
            <p>解決すべき競合はありません</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            競合解決
            <Badge variant="outline" className="ml-2">
              {currentIndex + 1} / {conflicts.length}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            同じデータが複数の端末で編集されました。どちらの変更を採用するか選択してください
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* エンティティ情報 */}
          <Card className="bg-gray-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm">
                <Badge>
                  {currentConflict.entityType === "card"
                    ? "カード"
                    : "フォルダ"}
                </Badge>
                <span className="text-gray-600">
                  ID: {currentConflict.entityId}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 自動マージ済みフィールド */}
          {Object.keys(currentConflict.autoMerged).filter(
            (key) =>
              !(key in currentConflict.conflicts) &&
              !["id", "userId", "deviceId", "createdAt", "updatedAt"].includes(
                key,
              ),
          ).length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Merge className="w-4 h-4 text-green-500" />
                  <h3 className="font-medium text-green-700">自動マージ済み</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(currentConflict.autoMerged)
                    .filter(
                      ([key]) =>
                        !(key in currentConflict.conflicts) &&
                        ![
                          "id",
                          "userId",
                          "deviceId",
                          "createdAt",
                          "updatedAt",
                        ].includes(key),
                    )
                    .map(([key, value]) => (
                      <div key={key} className="bg-green-50 p-2 rounded">
                        <span className="text-gray-500 text-xs">
                          {getFieldLabel(key)}
                        </span>
                        <p className="text-gray-800 truncate">
                          {truncateValue(formatValue(value), 50)}
                        </p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 競合フィールド */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <h3 className="font-medium">競合フィールド（選択が必要）</h3>
            </div>

            {Object.entries(currentConflict.conflicts).map(([key, value]) => (
              <Card key={key} className="border-yellow-300">
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-3">{getFieldLabel(key)}</h4>

                  <RadioGroup
                    value={fieldSelections[key] || "local"}
                    onValueChange={(val) =>
                      setFieldSelections({
                        ...fieldSelections,
                        [key]: val as "local" | "remote",
                      })
                    }
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* ローカル */}
                      <div
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          (fieldSelections[key] || "local") === "local"
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200"
                        }`}
                        onClick={() =>
                          setFieldSelections({
                            ...fieldSelections,
                            [key]: "local",
                          })
                        }
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <RadioGroupItem value="local" id={`${key}-local`} />
                          <Label
                            htmlFor={`${key}-local`}
                            className="font-medium flex items-center gap-2 cursor-pointer"
                          >
                            <HardDrive className="w-4 h-4 text-blue-500" />
                            ローカル
                          </Label>
                        </div>
                        <div className="text-sm text-gray-700 bg-white p-2 rounded max-h-32 overflow-y-auto">
                          <pre className="whitespace-pre-wrap break-words">
                            {truncateValue(formatValue(value.local))}
                          </pre>
                        </div>
                      </div>

                      {/* リモート */}
                      <div
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          fieldSelections[key] === "remote"
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200"
                        }`}
                        onClick={() =>
                          setFieldSelections({
                            ...fieldSelections,
                            [key]: "remote",
                          })
                        }
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <RadioGroupItem value="remote" id={`${key}-remote`} />
                          <Label
                            htmlFor={`${key}-remote`}
                            className="font-medium flex items-center gap-2 cursor-pointer"
                          >
                            <Cloud className="w-4 h-4 text-green-500" />
                            クラウド
                          </Label>
                        </div>
                        <div className="text-sm text-gray-700 bg-white p-2 rounded max-h-32 overflow-y-auto">
                          <pre className="whitespace-pre-wrap break-words">
                            {truncateValue(formatValue(value.remote))}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 操作ボタン */}
        <div className="border-t pt-4 mt-4">
          <div className="flex flex-wrap gap-2">
            {/* ナビゲーション */}
            <div className="flex gap-2 mr-auto">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex === 0}
                onClick={() => {
                  setCurrentIndex(currentIndex - 1);
                  setFieldSelections({});
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex === conflicts.length - 1}
                onClick={() => {
                  setCurrentIndex(currentIndex + 1);
                  setFieldSelections({});
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* 解決ボタン */}
            <Button
              variant="outline"
              onClick={handleResolveLocal}
              disabled={resolving}
            >
              <HardDrive className="w-4 h-4 mr-2" />
              全てローカル
            </Button>
            <Button
              variant="outline"
              onClick={handleResolveRemote}
              disabled={resolving}
            >
              <Cloud className="w-4 h-4 mr-2" />
              全てクラウド
            </Button>
            <Button onClick={handleResolveFields} disabled={resolving}>
              <Check className="w-4 h-4 mr-2" />
              選択内容で解決
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



