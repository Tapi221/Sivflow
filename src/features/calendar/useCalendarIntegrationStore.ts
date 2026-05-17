import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── アクセストークンはメモリ変数で管理（Zustand外）
// セキュリティ上の理由：localStorage は XSS で読まれる可能性がある。
// sessionStorage は同一セッションのみなのでまだマシ。
// Electron では OS キーチェーンを使うのが理想（将来対応）。

const SESSION_TOKEN_KEY = "flashcard-master.gcal.access_token";
const SESSION_EMAIL_KEY  = "flashcard-master.gcal.account_email";

/** セッション内メモリキャッシュ（モジュールスコープ） */
let _cachedToken: string | null = null;

export const readSessionToken = (): string | null => {
  if (_cachedToken) return _cachedToken;
  try {
    const raw = sessionStorage.getItem(SESSION_TOKEN_KEY);
    _cachedToken = raw;
    return raw;
  } catch {
    return null;
  }
};

export const writeSessionToken = (token: string | null): void => {
  _cachedToken = token;
  try {
    if (token) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // プライベートブラウジング等で失敗しても続行
  }
};

// ── Zustand persist で「誰が・何を選んでいたか」を永続化

type CalendarIntegrationPersistedState = {
  /** 接続済みフラグ（起動時の自動再接続判定に使う） */
  wasConnected: boolean;
  /** 前回接続したアカウント */
  accountEmail: string | null;
  /** 選択していたカレンダーID一覧 */
  selectedCalendarIds: string[];
};

type CalendarIntegrationActions = {
  markConnected: (email: string | null, calendarIds: string[]) => void;
  markDisconnected: () => void;
  setSelectedCalendarIds: (ids: string[]) => void;
  toggleCalendarId: (id: string) => void;
};

type CalendarIntegrationStore = CalendarIntegrationPersistedState &
  CalendarIntegrationActions;

export const useCalendarIntegrationStore =
  create<CalendarIntegrationStore>()(
    persist(
      (set, get) => ({
        wasConnected: false,
        accountEmail: null,
        selectedCalendarIds: [],

        markConnected: (email, calendarIds) =>
          set({
            wasConnected: true,
            accountEmail: email,
            selectedCalendarIds: calendarIds,
          }),

        markDisconnected: () => {
          writeSessionToken(null);
          set({
            wasConnected: false,
            accountEmail: null,
            selectedCalendarIds: [],
          });
        },

        setSelectedCalendarIds: (ids) =>
          set({ selectedCalendarIds: ids }),

        toggleCalendarId: (id) => {
          const current = get().selectedCalendarIds;
          const next = current.includes(id)
            ? current.filter((x) => x !== id)
            : [...current, id];
          set({ selectedCalendarIds: next });
        },
      }),
      {
        name: "flashcard-master.calendar-integration",
        // accessToken はここに含めない（セキュリティ + 有効期限があるため）
        partialize: (state) => ({
          wasConnected: state.wasConnected,
          accountEmail: state.accountEmail,
          selectedCalendarIds: state.selectedCalendarIds,
        }),
      },
    ),
  );