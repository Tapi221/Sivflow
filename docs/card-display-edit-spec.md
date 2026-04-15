# カード表示 / 編集モード統合仕様

## 1. 目的

カード表示における以下 4 状態の表示・編集・拡大挙動を統一し、
表示モード切替や編集遷移によってコンテンツサイズ・位置・余白が意図せず変化しないことを保証する。

- 最大表示閲覧 (`fluid view`)
- 最大表示編集 (`fluid edit`)
- カード表示閲覧 (`card view`)
- カード表示編集 (`card edit`)

本仕様は以下を目的とする。

- 表示モード切替で画像サイズ、テキストサイズ、数式サイズ、コードサイズが勝手に変わらない
- 編集画面と閲覧画面の見た目差分を最小化する
- `zoom` を表示モード切替とは独立した単一機能として扱う
- 将来的な Swift / Android ネイティブ実装へ移植可能な構造を前提にする

---

## 2. 用語定義

### 2.1 displayMode

カードの表示レイアウト方針を表す。

- `card`: カード表示
- `fluid`: 最大表示

### 2.2 interactionMode

操作状態を表す。

- `view`: 閲覧
- `edit`: 編集

### 2.3 zoom

コンテンツ表示倍率を表す単一機能。

- displayMode とは独立
- 全状態で共通の 1 機能
- ユーザーが見る最終的なコンテンツ本体サイズを制御する

### 2.4 コンテンツ本体

以下を含む、ユーザーの学習内容そのもの。

- テキスト
- 画像
- 数式
- コード
- 手書き

以下はコンテンツ本体に含めない。

- `?` / `☆` などのカードクローム
- 編集ハンドル
- 削除/複製/ドラッグ UI
- ツールバー

### 2.5 余白

本仕様では次を区別する。

- ブロックとブロックの間の余白
- ブロック枠の余白
- ブロック中身の余白
- 画像/メディア自体の周囲余白
- カードの上下固定余白

---

## 3. 状態モデル

実装上の状態は 2 軸で表現する。

- `displayMode`: `card | fluid`
- `interactionMode`: `view | edit`

組み合わせとしての画面状態は次の 4 つ。

- `fluid view`
- `fluid edit`
- `card view`
- `card edit`

---

## 4. 許可される遷移

許可される遷移は次の直列のみ。

`fluid edit ↔ fluid view ↔ card view ↔ card edit`

### 4.1 禁止遷移

以下は不可。

- `fluid edit ↔ card edit`
- 編集中に displayMode を直接切り替える遷移

### 4.2 遷移時の保持

既存 autosave 前提を継続する。
状態保持は「全部保持」を原則とする。

保持対象:

- 編集内容
- 手書き内容
- カーソル位置
- 選択中 block
- スクロール位置
- UI 状態

---

## 5. 不変条件

## 5.1 同一 displayMode 内の不変条件

### 5.1.1 fluid

`fluid view` と `fluid edit` は見た目が完全一致しなければならない。

一致必須:

- block 位置
- block 幅
- テキスト見た目サイズ
- 画像見た目サイズ
- 数式見た目サイズ
- コード見た目サイズ
- block 間余白
- block 枠余白
- block 中身余白
- 上下固定余白

差分として許可されるのは「編集できること」のみ。

### 5.1.2 card

`card view` と `card edit` も見た目が完全一致しなければならない。

一致必須:

- カード面上のコンテンツ位置
- テキスト見た目サイズ
- 画像見た目サイズ
- 数式見た目サイズ
- コード見た目サイズ
- 手書き見た目サイズ
- カード内余白

差分として許可されるのは「編集できること」のみ。

## 5.2 異なる displayMode 間の不変条件

`fluid` と `card` の間では、コンテンツ本体の見た目サイズを一致させる。

一致必須:

- テキスト見た目サイズ
- 画像見た目サイズ
- 数式見た目サイズ
- コード見た目サイズ
- 手書き見た目サイズ

一致不要:

- 余白の取り方
- 横幅の使い方
- 折り返し結果
- 配置ルール

---

## 6. zoom 仕様

## 6.1 基本方針

`zoom` は mode 非依存の単一機能である。

- 表示モード切替とは別機能
- 状態ごとに別 zoom を持たない
- 4 状態すべてで同じ概念を使う

## 6.2 card における zoom

`card` ではカード面を拡大する。

拡大対象:

- テキスト
- 画像
- 数式
- コード
- 手書き
- カード内余白

固定対象:

- `?` / `☆` 等の UI クローム

## 6.3 fluid における zoom

`fluid` ではレイアウト全体を拡大しない。
コンテンツ本体のみ拡大する。

固定対象:

- block 間余白
- block 枠余白
- block 中身余白
- 画像/メディア周囲余白
- 上下固定余白
- UI クローム

拡大対象:

- テキスト
- 画像
- 数式
- コード

## 6.4 自動縮小の禁止

困ったときに勝手に縮小して整合を取ることは禁止する。

---

## 7. card / fluid の表示ルール

## 7.1 card

- 手書き対応は `card view` のみ
- `card edit` は見た目を `card view` に一致させる
- card では余白もカード面の一部として zoom 対象

## 7.2 fluid

- `fluid edit` と `fluid view` は 1px もズレてはならない
- ブロック間余白は固定
- ブロック枠余白は固定
- ブロック中身余白は固定
- 画像/メディア自体の余白は固定
- 上下の固定余白は不変
- スクロール禁止
- 自然伸長は可

---

## 8. ブロック別挙動

## 8.1 幅不足時のルール

- text / question / markdown: 折り返し
- code: 横スクロール
- math: 横スクロール
- image:
  - fluid: コンテナ幅を超えない範囲で表示
  - card: カード面拡大に追従
- audio / link 系: 既存固定 UI 維持

## 8.2 画像

- displayMode 切替によって画像サイズは変わらない
- `zoom` によってのみ見た目サイズが変わる
- `card` / `fluid` いずれでも画像は拡大対象

## 8.3 テキスト

- displayMode 切替によって見た目サイズは変わらない
- `zoom` によってのみ拡大する
- `fluid edit` と `fluid view` の改行位置は一致が望ましい

## 8.4 コード

- code は横スクロール
- `zoom` は viewer / editor 双方に効く必要がある
- displayMode 切替で文字サイズが変わってはならない

## 8.5 数式

- math は横スクロール
- displayMode 切替で見た目サイズが変わってはならない
- `zoom` のみがサイズ差分要因

---

## 9. 編集 UI の扱い

編集 UI はすべて非レイアウト要素とする。
表示されても本文レイアウトを変えてはならない。

対象:

- カーソル
- 選択ハイライト
- 削除 UI
- 複製 UI
- ドラッグハンドル
- ツールバー

要件:

- block の位置・幅・高さを変えない
- block 間余白を変えない
- 表示/hover/focus/active でレイアウトを押し広げない
- overlay または portal 扱いで載せる

---

## 10. platform 非依存要件

将来的な Swift / Android ネイティブ実装を見据え、
以下は React / Electron 固有実装から分離する。

分離対象:

- 状態遷移
- displayMode ルール
- zoom ルール
- block 表示ルール
- overflow ルール
- 手書き座標系

要件:

- platform-agnostic core を持つ
- React は reference implementation として扱う
- runtime 判定は Electron 専用ではなく capability ベースへ寄せる

---

## 11. main 現状との差分と未完項目

main 時点で土台として入っているもの:

- `cardRenderSpec` の導入
- `DesktopCardSurface` 閲覧側での render spec 利用

main 時点で未完のもの:

### 11.1 編集経路への `displayMode / zoom` 配管

未完ファイル群:

- `CardEditorPane`
- `SharedCardContent`
- `BlockEditor`
- `CardBlockLayoutRenderer`

未完内容:

- edit props に `displayMode` がない
- edit props に `zoom` がない
- edit path へ `displayMode` / `zoom` が流れていない

### 11.2 block ごとの edit/view 一致

未完ファイル群:

- `TextBlockContent`
- `QuestionBlockContent`
- `CodeBlockContent`
- `MarkdownBlock`
- `MathBlock`
- `MediaBlock`

未完内容:

- view 側だけ zoom 対応している block が存在する
- edit 側の typography / layout / scale が viewer と共通化されていない

### 11.3 CardEditorPane の displayMode 対応

未完内容:

- `CardEditorPane` 自体が `displayMode` を持たない
- `EditorSidePane` は実質 fixed/card 前提
- 最大表示編集画面 (`fluid edit`) の仕様がコードに落ちていない

### 11.4 編集ペイン内の閲覧表示統一

未完内容:

- `CardEditorPane` 非編集時の `Flashcard` が `currentDisplayMode` に追従していない
- `contentZoom` / `displayMode` が統一されていない

---

## 12. 実装優先順位

### P0

- `CardEditorPane` に `displayMode` / `zoom` を導入
- `SharedCardContent(edit)` に `displayMode` / `zoom` を導入
- `BlockEditor -> CardBlockLayoutRenderer(edit)` に `zoom` を導入

### P1

- `TextBlockContent(edit)` を zoom 対応
- `QuestionBlockContent(edit)` を zoom 対応
- `CodeBlockContent(editor)` を zoom 対応

### P2

- `MarkdownBlock` / `MathBlock` / `MediaBlock` の edit 表示を zoom/displayMode に追従
- `CardEditorPane` 非編集時 `Flashcard` を `currentDisplayMode` に追従

---

## 13. 受け入れ条件

以下を満たしたとき、本仕様は実装完了とみなす。

1. `fluid view` と `fluid edit` で 1px のレイアウト差分もない
2. `card view` と `card edit` でコンテンツ見た目差分がない
3. displayMode 切替で画像・テキスト・コード・数式サイズが変わらない
4. `zoom` のみがコンテンツサイズ変更要因である
5. code / math は横スクロールし、自動縮小しない
6. 編集 UI 表示で本文レイアウトが変わらない
7. `CardEditorPane` 配下でも `displayMode` と `zoom` の整合が取れる
8. 将来的に Swift / Android ネイティブへ持ち出せるよう、core 仕様が UI 実装から独立している
