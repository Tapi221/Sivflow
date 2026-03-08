import { FileText, Plus } from "@/ui/icons";

import { Button } from "@/components/ui/button";

type EmptySelectionStateProps = {
  onStartNew: () => void;
};

export function EmptySelectionState({ onStartNew }: EmptySelectionStateProps) {
  return (
    <div className="flex h-full min-h-[400px] items-center justify-center text-slate-400">
      <div className="text-center">
        <FileText className="mx-auto mb-4 h-12 w-12 opacity-30" />
        <p className="text-sm font-bold">
          左のツリーからカードを選択してください
        </p>
        <p className="mt-2 text-xs opacity-70">
          カードをクリックすると閲覧できます
        </p>

        <div className="mt-6">
          <Button
            type="button"
            className="h-10 rounded-full px-5"
            onClick={onStartNew}
          >
            <Plus className="mr-2 h-4 w-4" />
            新規カードを作成
          </Button>
        </div>
      </div>
    </div>
  );
}

type NewCardIdleStateProps = {
  onStartEditing: () => void;
  onCancel: () => void;
};

export function NewCardIdleState({
  onStartEditing,
  onCancel,
}: NewCardIdleStateProps) {
  return (
    <div className="flex h-full min-h-[400px] items-center justify-center text-slate-400">
      <div className="text-center">
        <p className="text-sm font-bold">新規カードを作成します</p>
        <p className="mt-2 text-xs opacity-70">
          「作成開始」を押して編集を始めてください
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            type="button"
            className="h-10 rounded-full px-5"
            onClick={onStartEditing}
          >
            <Plus className="mr-2 h-4 w-4" />
            作成開始
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-full px-5"
            onClick={onCancel}
          >
            戻る
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CardEditorLoadingState() {
  return <div className="h-full p-4 text-slate-400">Loading...</div>;
}



