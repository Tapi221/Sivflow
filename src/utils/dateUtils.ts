/**
 * 日付ユーティリティ関数
 */

/**
 * 最終アクセス日時を相対的な文字列に変換する
 * @param lastAccessAt - 最終アクセス日時（Date, Timestamp, null/undefined）
 * @returns 表示用の文字列とスタイル情報
 */
export const formatLastAccess = (
  lastAccessAt: Date | { toDate: () => Date } | null | undefined,
): {
  text: string;
  isToday: boolean;
} => {
  // 未アクセスの場合
  if (!lastAccessAt) {
    return { text: "未学習", isToday: false };
  }

  // Firestore Timestamp の場合は Date に変換
  let accessDate: Date;
  if (typeof (lastAccessAt as { toDate?: () => Date })?.toDate === "function") {
    accessDate = (lastAccessAt as { toDate: () => Date }).toDate();
  } else if (lastAccessAt instanceof Date) {
    accessDate = lastAccessAt;
  } else {
    return { text: "未学習", isToday: false };
  }

  // 無効な日付の場合
  if (isNaN(accessDate.getTime())) {
    return { text: "未学習", isToday: false };
  }

  // 現在時刻を取得
  const now = new Date();

  // 日付境界（0:00）を基準に日数を計算
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const accessStart = new Date(
    accessDate.getFullYear(),
    accessDate.getMonth(),
    accessDate.getDate(),
  );

  // ミリ秒単位の差分を日数に変換
  const diffMs = todayStart.getTime() - accessStart.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // 日数に応じて表示文言を決定
  if (diffDays === 0) {
    return { text: "今日", isToday: true };
  } else if (diffDays === 1) {
    return { text: "1日前", isToday: false };
  } else if (diffDays > 1) {
    return { text: `${diffDays}日前`, isToday: false };
  } else {
    // 未来の日付（通常は発生しないが念のため）
    return { text: "今日", isToday: true };
  }
};



