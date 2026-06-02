## tests/cardSetViewWindowEvents.test.ts

- [ ] dispatches and receives typed draft patch payload

## tests/src/architecture/importPathPolicy.test.ts

- [ ] 同一階層の参照は相対パスを使用する
- [ ] 階層をまたぐ参照は @/ エイリアスを使用する
- [ ] import path のズレを互換パス追加で隠さず、参照元の import path を修正する
- [ ] import 文を複数行に展開せず、各 import 文を1行に保つ

## tests/src/architecture/sourceOrderPolicy.test.ts

- [ ] import、型定義、定数、helper 関数、component 本体、memo / displayName / export の順に並べる
- [ ] 各ブロックの間には空行を1行だけ挟む
- [ ] 依存される型、定数、helper を依存する定義より先に置く

## tests/src/architecture/constantsDirectoryPolicy.test.ts

- [ ] constants / src/constants / packages/*/constants のような定数専用フォルダを作らない
- [ ] 単一ファイル専用の値を shared / utils / config / constants / .constants.ts に逃がさず、使用ファイル内に保持する
- [ ] 複数ファイルで使う定数だけ責務を持つ module と同じ階層の <責務名>.constants.ts に置く
- [ ] @constants のような横断 barrel export を作らない

## tests/src/architecture/platformDirectoryPolicy.test.ts

- [ ] Web 起動口は apps/web に限定し、共有 React UI 本体を packages/web-renderer に置く
- [ ] Tauri shell は apps/desktop/src-tauri に限定し、Desktop UI を apps/desktop に置かない
- [ ] Desktop の LAN WebSocket server / session command / native capability は apps/desktop/src-tauri/src に置く
- [ ] React Native app 起動口は apps/mobile に限定し、RN UI 本体を packages/mobile-renderer に置く
- [ ] apps/mobile/src/App.tsx は起動口と navigation 接続に留め、手書き画面本体を renderer package に置く
- [ ] iPad 専用手書き画面と toolbar は packages/mobile-renderer/src/screens/ipad/handwriting と packages/mobile-renderer/src/components/ipad/ink に置く
- [ ] スマホには手書きモードの navigation と screen を出さない
- [ ] Swift / PencilKit 実装は apps/mobile/ios/Manifolia 配下の native extension として扱い、Swift 専用 app root を作らない
- [ ] PencilKit view は NativeViews、InkStroke export / session bridge は NativeModules に分ける
- [ ] Ink document と handwriting session の共有構造は shared/schemas に置く
