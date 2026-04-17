export const IPC_CHANNELS = {
  appGetVersion: "desktop:app:getVersion",
  shellOpenExternal: "desktop:shell:openExternal",
  oauthStart: "oauth:start",
  oauthCancel: "oauth:cancel",
  oauthExchangeIdToken: "oauth:exchangeIdToken",
  oauthCallback: "oauth:callback",
  windowMinimize: "window:minimize",
  windowMaximizeToggle: "window:maximizeToggle",
  windowClose: "window:close",
  windowIsMaximized: "window:isMaximized",
  windowMaximizedState: "window:maximizedState",
} as const;