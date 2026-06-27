declare let __webpack_public_path__: string | undefined;

// Vite の開発サーバーでは webpack 固有の __webpack_public_path__ が存在しない。
// 未定義のまま代入すると ESM 実行時に ReferenceError になり、白画面で止まる。
// webpack 環境でだけ public path を反映する。
if (typeof __webpack_public_path__ !== 'undefined') {
  __webpack_public_path__ = environment.publicPath;
}

export {};
