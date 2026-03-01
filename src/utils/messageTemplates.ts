/**
 * メッセージテンプレート
 * 
 * コンテキストに応じた適切なメッセージを提供する
 */

export const MESSAGE_TEMPLATES = {
  // 初期化メッセージ
  init: {
    first_time: '初期設定中です。',
    normal: 'データを更新中です。',
    recovery: 'データを復旧中です。',
  },

  // 同期メッセージ
  sync: {
    initial: 'アカウント情報を準備しています。',
    update: '最新の情報を取得しています。',
    offline_recovery: 'オフライン中の編集をクラウドに保存しています。',
  },

  // 詳細メッセージ
  details: {
    first_time: 'アカウント情報を準備しています。\nこの処理は初回のみ実行されます。',
    normal: '最新のデータを取得しています。\nこの処理によってデータが失われることはありません。',
    recovery: '問題を自動的に修復しています。\nデータは安全に保存されています。',
  },
};

/**
 * コンテキストに応じたメッセージを取得
 */
export function getContextualMessage(
  type: 'init' | 'sync' | 'details',
  context: string
): string {
  return MESSAGE_TEMPLATES[type][context as keyof typeof MESSAGE_TEMPLATES[typeof type]] || '';
}
