## tests/logic/StatisticsLogic.test.js

- [ ] カード配列が空なら空状態用の props を返す
- [ ] カードが存在するなら通常状態用の props を返す

## tests/logic/architectureDirectoryLayoutLogic.test.js

- [ ] Web と Tauri は renderer を共有する
- [ ] React Native は別 renderer として扱う
- [ ] Swift は React Native app の ios 配下 native extension として扱う
- [ ] Swift 専用 app を作らない
- [ ] 共通構造は shared/schemas、shared/design-tokens、shared/assets に寄せる

## tests/logic/constantsResponsibilityLogic.test.js

- [ ] 定数の置き場所を責務 module から決定する
- [ ] 1ファイル専用の値は同じファイル内に残す
- [ ] 複数ファイルで使う値だけ同階層の責務付き .constants.ts に昇格する
