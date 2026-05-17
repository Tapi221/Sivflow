export const IPC_CHANNELS = {
  appGetVersion: "desktop:app:getVersion",
  shellOpenExternal: "desktop:shell:openExternal",
  desktopImportFileOpen: "desktop:importFile:open",
  desktopImportReadFile: "desktop:importFile:read",
  desktopImportSelectFiles: "desktop:importFile:select",
  oauthStart: "oauth:start",
  oauthCancel: "oauth:cancel",
  oauthExchangeIdToken: "oauth:exchangeIdToken",
  oauthExchangeTokens: "oauth:exchangeTokens",
  // refresh_token を使った silent なトークン更新チャンネル
  oauthRefreshTokens: "oauth:refreshTokens",
  oauthCallback: "oauth:callback",
  windowMinimize: "window:minimize",
  windowMaximizeToggle: "window:maximizeToggle",
  windowClose: "window:close",
  windowIsMaximized: "window:isMaximized",
  windowMaximizedState: "window:maximizedState",
} as const;
