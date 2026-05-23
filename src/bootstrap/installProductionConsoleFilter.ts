const noop = () => undefined;

const shouldSuppressVerboseConsole = (): boolean => {
  if (!import.meta.env.PROD) return false;

  // 本番で一時的に詳細ログを確認したい場合だけ有効化する。
  return import.meta.env.VITE_ENABLE_PRODUCTION_VERBOSE_CONSOLE !== "true";
};

export const installProductionConsoleFilter = (): void => {
  if (!shouldSuppressVerboseConsole()) return;

  console.debug = noop;
  console.log = noop;
  console.info = noop;
};

installProductionConsoleFilter();
