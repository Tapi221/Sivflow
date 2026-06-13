import { Button } from "@/chip/ui/button/button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Plus } from "@/ui/icons";



type NewCardIdleStateProps = {
  onStartEditing: () => void;
  onCancel: () => void;
};



const NewCardIdleState = ({
  onStartEditing,
  onCancel,
}: NewCardIdleStateProps) => {
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
};
const CardEditorLoadingState = () => {
  return <LoadingSpinner className="h-full min-h-[400px] text-slate-400" label="カードを読み込み中" />;
};



export { CardEditorLoadingState, NewCardIdleState };
