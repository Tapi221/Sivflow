type ReactDevToolsHook = {
  supportsFiber?: boolean;
  isDisabled?: boolean;
  inject: () => number;
  onCommitFiberRoot: () => void;
  onCommitFiberUnmount: () => void;
};

type DevelopmentDiagnosticsGlobal = typeof globalThis & {
  __REACT_DEVTOOLS_GLOBAL_HOOK__?: ReactDevToolsHook;
  litIssuedWarnings?: Set<string>;
};

const getDevelopmentDiagnosticsGlobal = (): DevelopmentDiagnosticsGlobal =>
  globalThis as DevelopmentDiagnosticsGlobal;

const disableReactDevToolsInstallHint = () => {
  const globalObject = getDevelopmentDiagnosticsGlobal();
  if (globalObject.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    return;
  }

  globalObject.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    isDisabled: true,
    inject: () => -1,
    onCommitFiberRoot: () => {},
    onCommitFiberUnmount: () => {},
  };
};

const markLitDevModeWarningAsHandled = () => {
  const globalObject = getDevelopmentDiagnosticsGlobal();
  globalObject.litIssuedWarnings ??= new Set<string>();
  globalObject.litIssuedWarnings.add('dev-mode');
};

// 外部ライブラリの英語開発診断ログは、console を横取りせず発生元の診断フラグで止める。
disableReactDevToolsInstallHint();
markLitDevModeWarningAsHandled();

export {};
