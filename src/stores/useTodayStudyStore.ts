/**
 * useTodayStudyStore - 当日の学習集計 & 追い復習キュー
 *
 * - localStorage に永続化し、リロード/画面遷移後も失わない
 * - 日付が変わったら自動リセット（hydrate / resetIfNewDay で検出）
 * - userId が変わったらリセット（複数アカウントでの混在防止）
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";



type RatingKey = "forgot" | "vague" | "remembered" | "easy";
type TodayStudyState = {
  dateKey: string;
  userId: string;
  ratings: Record<RatingKey, number>;
  /** 忘れた/あいまいのカード ID（追い復習対象） */
  extraQueue: string[];
  /** 追い復習で消化済みのカード ID */
  extraDone: string[];
};
type TodayStudyActions = {
  /** マウント時・userId 変更時に呼ぶ。日付/userId が変わっていたらリセット */
  hydrate: (userId: string) => void;
  /** フォーカス/visibilitychange 復帰時に呼ぶ。新しい日付ならリセット */
  resetIfNewDay: (userId?: string) => void;
  /** 1 枚分の評価を積む */
  addRating: (key: RatingKey, delta?: number) => void;
  /** 忘れた/あいまい のカードを追い復習キューに追加（重複なし） */
  markForExtra: (cardId: string) => void;
  /** 追い復習で OK になったカードをキューから除外 */
  markExtraDone: (cardId: string) => void;
};
type TodayStudyStore = TodayStudyState & TodayStudyActions;



const useTodayStudyStore = create<TodayStudyStore>()(persist((set, get) => ({ ...initialState(), hydrate: (userId: string) => {
  const s = get();
  const today = localDateKey();
  if (s.dateKey !== today || s.userId !== userId) {
    set(initialState(userId));
  }
},

resetIfNewDay: (userId?: string) => {
  const s = get();
  const today = localDateKey();
  const uid = userId ?? s.userId;
  if (s.dateKey !== today || (userId && s.userId !== userId)) {
    set(initialState(uid));
  }
},

addRating: (key: RatingKey, delta = 1) =>
  set((s) => ({
    ratings: { ...s.ratings, [key]: (s.ratings[key] ?? 0) + delta },
  })),

markForExtra: (cardId: string) =>
  set((s) => {
    if (s.extraQueue.includes(cardId)) return s;
    return { extraQueue: [...s.extraQueue, cardId] };
  }),

markExtraDone: (cardId: string) =>
  set((s) => ({
    extraQueue: s.extraQueue.filter((id) => id !== cardId),
    extraDone: s.extraDone.includes(cardId)
      ? s.extraDone
      : [...s.extraDone, cardId],
  })),
}),
{
  name: "manifolmia-today-study",
  // アクション関数は除外して状態のみ永続化
  partialize: (s) => ({
    dateKey: s.dateKey,
    userId: s.userId,
    ratings: s.ratings,
    extraQueue: s.extraQueue,
    extraDone: s.extraDone,
  }),
},
),
);



const emptyRatings = (): Record<RatingKey, number> => ({
  forgot: 0,
  vague: 0,
  remembered: 0,
  easy: 0,
});
/** ローカル日付を YYYY-MM-DD 形式で返す */
const localDateKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const initialState = (userId = "anon"): TodayStudyState => ({
  dateKey: localDateKey(),
  userId,
  ratings: emptyRatings(),
  extraQueue: [],
  extraDone: [],
});



export { useTodayStudyStore };


export type { RatingKey, TodayStudyStore };
