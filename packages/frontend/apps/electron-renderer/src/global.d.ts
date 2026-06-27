import type {
  AppInfo,
  ClientEvents,
  ClientHandler,
  SharedStorage,
} from '@affine/electron-api';

/**
 * Electron preload から公開されるグローバル API を Window 型へ追加する。
 */
declare global {
  interface Window {
    __appInfo?: AppInfo | null;
    __apis?: ClientHandler;
    __events?: ClientEvents;
    __sharedStorage?: SharedStorage;
  }
}

export {};
