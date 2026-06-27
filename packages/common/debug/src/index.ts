import debug from 'debug';
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type ConsoleNoticeLevel = 'log' | 'info' | 'warn';

declare const BUILD_CONFIG: { readonly debug?: boolean } | undefined;

const SESSION_KEY = 'affine:debug';

const HIDDEN_DEVELOPMENT_CONSOLE_NOTICES = [
  'Download the React DevTools for a better development experience',
  'i18next is made possible by our own product, Locize',
];

const shouldHideDevelopmentConsoleNotice = (args: unknown[]): boolean => {
  const message = args
    .map(arg => (typeof arg === 'string' ? arg : ''))
    .join(' ');

  return HIDDEN_DEVELOPMENT_CONSOLE_NOTICES.some(notice =>
    message.includes(notice)
  );
};

const installDevelopmentConsoleFilters = () => {
  const levels: ConsoleNoticeLevel[] = ['log', 'info', 'warn'];

  levels.forEach(level => {
    const original = console[level].bind(console);

    console[level] = (...args: unknown[]) => {
      if (shouldHideDevelopmentConsoleNotice(args)) {
        return;
      }

      original(...args);
    };
  });
};

const localizeDebugLogMessage = (message: string): string => {
  if (message === 'i18n initialized') {
    return 'i18n を初期化しました';
  }
  if (message === 'Failed to fetch workspace share settings') {
    return 'ワークスペースの共有設定の取得に失敗しました';
  }
  if (message === 'Failed to fetch workspace invite link') {
    return 'ワークスペース招待リンクの取得に失敗しました';
  }

  const loadedI18nResource = /^Loaded i18n (.+) resource$/.exec(message);
  if (loadedI18nResource) {
    return `${loadedI18nResource[1]} の翻訳リソースを読み込みました`;
  }

  const failedI18nResource = /^Failed to load i18n (.+) resource$/.exec(message);
  if (failedI18nResource) {
    return `${failedI18nResource[1]} の翻訳リソースの読み込みに失敗しました`;
  }

  const openedWorkspace = /^open workspace \[(.+)] (.+)\s*$/.exec(message);
  if (openedWorkspace) {
    return `ワークスペースを開きました [${openedWorkspace[1]}] ${openedWorkspace[2]}`;
  }

  return message;
};

if (typeof window !== 'undefined') {
  installDevelopmentConsoleFilters();

  const getSessionValue = (key: string) => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const setSessionValue = (key: string, value: string) => {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // ストレージにアクセスできない環境では何もしない
    }
  };

  // URL に `debug` が含まれる場合だけデバッグログを有効にする
  // 例: http://localhost:3000/?debug
  if (window.location.search.includes('debug')) {
    // 現在のセッションだけデバッグログを有効にする
    // 画面遷移後にクエリ文字列が消える場合があるため、
    // sessionStorage にデバッグフラグを保存する
    setSessionValue(SESSION_KEY, 'true');
  }
  if (getSessionValue(SESSION_KEY) === 'true') {
    // 既定ではすべてのデバッグログを有効にする
    debug.enable('*');
    console.warn('デバッグログが有効です');
  }
  if (typeof BUILD_CONFIG !== 'undefined' && BUILD_CONFIG?.debug) {
    debug.enable('*,-micromark');
    console.warn('デバッグログが有効です');
  }
}

export class DebugLogger {
  private readonly _debug: debug.Debugger;

  constructor(namespace: string) {
    this._debug = debug(namespace);
  }

  set enabled(enabled: boolean) {
    this._debug.enabled = enabled;
  }

  get enabled() {
    return this._debug.enabled;
  }

  debug(message: string, ...args: any[]) {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log('error', message, ...args);
  }

  log(level: LogLevel, message: string, ...args: any[]) {
    this._debug.log = console[level].bind(console);
    this._debug(`[${level.toUpperCase()}] ${localizeDebugLogMessage(message)}`, ...args);
  }
}
