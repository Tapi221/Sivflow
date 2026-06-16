import { openSupportContact } from "./appInitSupportContact";
import { notificationService } from "./NotificationService";



const notifyLocalDbFallbackMode = (args: { recoveryGuideUrl: string;
}): void => {
  notificationService.warning(
    "ローカル保存が利用できません",
    "このセッションではメモリ保存で継続します。再読み込みで未同期データが消える可能性があります。Chrome のサイトデータ削除で復旧できます。",
    {
      details: `復旧手順: ${args.recoveryGuideUrl}`,
      closeable: true,
    },
  );
};
const notifyRebuildLoopDetected = (args: { userId: string; }): void => {
  notificationService.error("申し訳ございません。", "通常は自動的に復旧しますが、\n今回は自動復旧の上限を超えたため、起動できない状態です。\n\nこの問題はユーザー操作が原因ではありません。\nシステム側の調査が必要です。", {
    details: `エラーコード: rebuild_loop\nユーザーID: ${args.userId}\nタイムスタンプ: ${new Date().toISOString()}`, actions: [{
      label: "サポートに連絡", onClick: () => {
        void openSupportContact("mailto:support@example.com?subject=再構築ループエラー&body=エラーコード: rebuild_loop");
      },
      primary: true,
    },
    ],
  },
  );
};
const notifyStartupDegraded = (): void => {
  notificationService.warning("一部データをスキップして起動しました", "破損データを除外して継続しています。必要に応じて同期を実行してください。", { closeable: true });
};



export { notifyLocalDbFallbackMode, notifyRebuildLoopDetected, notifyStartupDegraded };
