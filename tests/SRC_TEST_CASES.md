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
