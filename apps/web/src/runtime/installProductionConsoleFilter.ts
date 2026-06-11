type ConsoleMethodName = "debug" | "log" | "info" | "warn" | "error";
type ConsoleMethod = (...data: unknown[]) => void;



const JAPANESE_CONSOLE_LABELS_INSTALLED_KEY = "__sivflowJapaneseConsoleLabelsInstalled";
const CONSOLE_MESSAGE_LABELS: Record<string, string> = {
  "[GoogleCalendarOAuth] reconnect diagnosis": "[GoogleCalendarOAuth] 再接続診断",
  "[GoogleCalendarOAuth] token endpoint failed": "[GoogleCalendarOAuth] トークンエンドポイントで失敗しました",
  "[GoogleCalendarOAuth] stored refresh token decrypt failed": "[GoogleCalendarOAuth] 保存済み refresh token の復号に失敗しました",
  "[GoogleCalendarOAuth] refresh token missing with no stored fallback": "[GoogleCalendarOAuth] refresh token がなく保存済み fallback もありません",
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
const noop = () => undefined;
const getLocalizedErrorMessage = (message: string): string => {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("google token authorization_code failed") ||
    normalizedMessage.includes("google トークンの認可コード交換に失敗")
  ) {
    if (
      normalizedMessage.includes("invalid_client") ||
      normalizedMessage.includes("oauth client was not found")
    ) {
      return "Google 認可コードの交換に失敗しました。OAuth クライアントが見つからないか、client ID / client secret の設定が一致していません。Google Cloud Console と Firebase Functions の設定を確認してください。";
    }

    return "Google 認可コードの交換に失敗しました。OAuth 設定と redirect URI を確認してください。";
  }

  if (
    normalizedMessage.includes("google token refresh_token failed") ||
    normalizedMessage.includes("google トークンのrefresh token 更新に失敗")
  ) {
    if (normalizedMessage.includes("invalid_grant")) {
      return "Google refresh token の更新に失敗しました。権限取り消し、期限切れ、または token の無効化が考えられます。";
    }

    if (
      normalizedMessage.includes("invalid_client") ||
      normalizedMessage.includes("oauth client was not found")
    ) {
      return "Google refresh token の更新に失敗しました。OAuth クライアント設定が一致していません。";
    }

    return "Google refresh token の更新に失敗しました。";
  }

  if (normalizedMessage.includes("the oauth client was not found")) {
    return "OAuth クライアントが見つかりません。Google Cloud Console の Web OAuth クライアント ID と Firebase Functions の設定を確認してください。";
  }

  if (normalizedMessage.includes("invalid_client")) {
    return "OAuth クライアント ID または client secret が無効です。Google Cloud Console と Firebase Functions の設定を確認してください。";
  }

  if (normalizedMessage.includes("unauthorized_client")) {
    return "OAuth クライアントがこの認可フローを許可されていません。Google Cloud Console の OAuth クライアント設定を確認してください。";
  }

  if (normalizedMessage.includes("invalid_grant")) {
    return "認可コードまたは refresh token が無効です。コードの再利用、期限切れ、権限取り消しが考えられます。";
  }

  if (normalizedMessage.includes("stored refresh token is missing")) {
    return "保存済み refresh token がありません。サーバー側の Google Calendar 連携保存状態を確認してください。";
  }

  if (normalizedMessage.includes("google calendar account not found")) {
    return "保存済み Google Calendar アカウントが見つかりません。";
  }

  if (normalizedMessage.includes("firebase authentication is required")) {
    return "Google Calendar 同期には Firebase 認証が必要です。ログイン状態が戻った後に再試行します。";
  }

  if (normalizedMessage.includes("authentication required")) {
    return "認証が必要です。";
  }

  if (normalizedMessage.includes("cross-origin-opener-policy")) {
    return "ブラウザの Cross-Origin-Opener-Policy により OAuth 連携ウィンドウの状態確認が制限されました。";
  }

  return message;
};
const translateErrorPayload = (error: Error): Record<string, unknown> => {
  const errorWithMetadata = error as Error & {
    code?: unknown;
    details?: unknown;
    status?: unknown;
  };
  const localizedMessage = getLocalizedErrorMessage(error.message);
  const translated: Record<string, unknown> = {
    名前: error.name,
    メッセージ: localizedMessage,
  };

  if (localizedMessage !== error.message) {
    translated.原文メッセージ = error.message;
  }

  if (errorWithMetadata.code !== undefined) translated.エラーコード = errorWithMetadata.code;
  if (errorWithMetadata.status !== undefined) translated.HTTPステータス = errorWithMetadata.status;
  if (errorWithMetadata.details !== undefined) translated.詳細 = errorWithMetadata.details;
  if (error.stack) translated.スタック = error.stack;

  return translated;
};
const translateNestedPayload = (payload: unknown): unknown => {
  if (payload instanceof Error) return translateErrorPayload(payload);

  if (!isRecord(payload)) return payload;

  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, translateNestedPayload(value)]),
  );
};
const translateGoogleCalendarConsolePayload = (
  message: string,
  payload: unknown,
): unknown => {
  if (!isRecord(payload)) return translateNestedPayload(payload);

  switch (message) {
    case "[GoogleCalendarOAuth] reconnect diagnosis":
      return {
        処理: payload.context,
        アカウントID: payload.accountId,
        エラーコード: payload.code,
        原因: payload.cause,
        再連携が必要: payload.reconnectRequired,
        対応: payload.action,
        エラー詳細: translateNestedPayload(payload.error),
      };

    case "[GoogleCalendarOAuth] token endpoint failed":
      return {
        処理: payload.context,
        HTTPステータス: payload.status,
        Googleエラー: payload.googleError,
        説明: payload.description,
      };

    case "[GoogleCalendarOAuth] refresh token missing with no stored fallback":
      return {
        強制更新: payload.forceRefreshToken,
        ユーザーID: payload.uid,
        アカウントID: payload.accountId,
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
      return translateNestedPayload(payload);
  }
};
const translateConsolePayload = (
  message: string,
  payload: unknown,
  index: number,
): unknown => index === 0
  ? translateGoogleCalendarConsolePayload(message, payload)
  : translateNestedPayload(payload);
const translateConsoleArguments = (data: unknown[]): unknown[] => {
  const [message, ...rest] = data;

  if (typeof message !== "string") return data.map(translateNestedPayload);

  return [
    CONSOLE_MESSAGE_LABELS[message] ?? getLocalizedErrorMessage(message),
    ...rest.map((payload, index) => translateConsolePayload(message, payload, index)),
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

  wrapConsoleMethod("warn");
  wrapConsoleMethod("error");
};
if (import.meta.env.PROD) {
  const originalDebug = console.debug.bind(console);
  const originalInfo = console.info.bind(console);
  const originalLog = console.log.bind(console);

  console.debug = noop as Console["debug"];
  console.info = noop as Console["info"];
  console.log = noop as Console["log"];

  installJapaneseConsoleLabels();

  if (import.meta.env.VITE_BUILD_VERSION === "debug") {
    console.debug = originalDebug as Console["debug"];
    console.info = originalInfo as Console["info"];
    console.log = originalLog as Console["log"];
  }
}
