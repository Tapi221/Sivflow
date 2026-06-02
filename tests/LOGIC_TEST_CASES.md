## tests/logic/StatisticsLogic.test.js

- [ ] カード配列が空なら空状態用の props を返す
- [ ] カードが存在するなら通常状態用の props を返す

## tests/logic/architectureDirectoryLayoutLogic.test.js

- [ ] Web と Tauri は renderer を共有する
- [ ] React Native は別 renderer として扱う
- [ ] Swift は React Native app の ios 配下 native extension として扱う
- [ ] Swift 専用 app を作らない
- [ ] Web 起動口は apps/web、Tauri shell は apps/desktop、React Native 起動口は apps/mobile に分ける
- [ ] 共通構造は shared/schemas、shared/design-tokens、shared/assets に寄せる

## tests/logic/constantsResponsibilityLogic.test.js

- [ ] 定数の置き場所を責務 module から決定する
- [ ] 1ファイル専用の値は同じファイル内に残す
- [ ] 複数ファイルで使う値だけ同階層の責務付き .constants.ts に昇格する
- [ ] constants 専用フォルダと @constants barrel を拒否する
- [ ] platform ではなく責務を基準に constants の昇格先を決める

## tests/logic/handwritingModeResponsibilityLogic.test.js

- [ ] InkDocument / InkStroke / InkPoint / InkSide / InkTool を core の純粋 model として扱う
- [ ] Web/Desktop の Ink UI は web-renderer、iPad 専用 RN UI は mobile-renderer の ipad 配下に分ける
- [ ] PencilKit view と export / bridge module を NativeViews と NativeModules に分ける
- [ ] Desktop/Tauri は通信と native capability に限定し、表示 UI を持たない
- [ ] handwriting session の interface と adapter 差分を packages/platform/src/handwriting に閉じ込める
