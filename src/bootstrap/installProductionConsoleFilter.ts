const noop = () => undefined;

type ConsoleMethodName = "debug" | "log" | "info" | "warn" | "error";
type ConsoleMethod = (...data: unknown[]) => void;

const JAPANESE_CONSOLE_LABELS_INSTALLED_KEY = "__flashcardMasterJapaneseConsoleLabelsInstalled";

const GOOGLE_CALENDAR_CONSOLE_LABELS: Record<string, string> = {
  "[GoogleCalendarOAuth] reconnect diagnosis": "[GoogleCalendarOAuth] 再接続診断",
  "[GoogleCalendar] OAuth config": "[GoogleCalendar] OAuth 設定",
  "[GoogleCalendar] Ignoring mismatched desktop OAuth redirect URI from env": "[GoogleCalendar] 環境変数のデスクトップ OAuth リダイレクト URI が一致しないため無視します",
  "[GoogleCalendar] calendar list refresh failed": "[GoogleCalendar] カレンダー一覧の更新に失敗しました",
  "[GoogleCalendar] silent token refresh failed": "[GoogleCalendar] バックグラウンドでのトークン更新に失敗しました",
  "[GoogleCalendar] connected account has no visible calendars": "[GoogleCalendar] 接続したアカウントに表示可能なカレンダーがありません",
  "[GoogleCalendar] reconnect failed": "[GoogleCalendar] 再接続に失敗しました",
  "[GoogleCalendar] connect failed": "[GoogleCalendar] 接続に失敗しました",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const translateGoogleCalendarConsolePayload = (
  message: string,
  payload: unknown,
): unknown => {
  if (!isRecord(payload)) return payload;

  switch (message) {
    case "[GoogleCalendarOAuth] reconnect diagnosis":
      return {
        処理: payload.context,
        アカウントID: payload.accountId,
        エラーコード: payload.code,
        原因: payload.cause,
        再連携が必要: payload.reconnectRequired,
        対応: payload.action,
        エラー詳細: payload.error,
      };

    case "[GoogleCalendar] OAuth config":
      return {
        フロー: payload.flow,
        実行環境: payload.runtime,
        クライアントID: payload.clientId,
        オリジン: payload.origin,
        リダイレクトURI: payload.redirectUri,
      };

    case "[GoogleCalendar] Ignoring mismatched desktop OAuth redirect URI from env":
      return {
        期待値: payload.expected,
        実際の値: payload.actual,
      };

    case "[GoogleCalendar] connected account has no visible calendars":
      return {
        アカウントメール: payload.accountEmail,
      };

    default:
      return payload;
  }
};

const translateConsoleArguments = (data: unknown[]): unknown[] => {
  const [message, ...rest] = data;

  if (typeof message !== "string") return data;

  return [
    GOOGLE_CALENDAR_CONSOLE_LABELS[message] ?? message,
    ...rest.map((payload, index) =>
      index === 0 ? translateGoogleCalendarConsolePayload(message, payload) : payload,
    ),
  ];
};

const wrapConsoleMethod = (method: ConsoleMethodName): void => {
  const original = console[method].bind(console) as ConsoleMethod;

  console[method] = ((...data: unknown[]) => {
    original(...translateConsoleArguments(data));
  }) as Console[ConsoleMethodName];
};

const installJapaneseConsoleLabels = (): void => {
  const globalConsoleState = globalThis as typeof globalThis & {
    [JAPANESE_CONSOLE_LABELS_INSTALLED_KEY]?: boolean;
  };

  if (globalConsoleState[JAPANESE_CONSOLE_LABELS_INSTALLED_KEY]) return;

  globalConsoleState[JAPANESE_CONSOLE_LABELS_INSTALLED_KEY] = true;

  wrapConsoleMethod("debug");
  wrapConsoleMethod("log");
  wrapConsoleMethod("info");
  wrapConsoleMethod("warn");
  wrapConsoleMethod("error");
};

const shouldSuppressVerboseConsole = (): boolean => {
  if (!import.meta.env.PROD) return false;

  // 本番で一時的に詳細ログを確認したい場合だけ有効化する。
  return import.meta.env.VITE_ENABLE_PRODUCTION_VERBOSE_CONSOLE !== "true";
};

export const installProductionConsoleFilter = (): void => {
  installJapaneseConsoleLabels();

  if (!shouldSuppressVerboseConsole()) return;

  console.debug = noop;
  console.log = noop;
  console.info = noop;
};

installProductionConsoleFilter();
