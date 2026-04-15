# CardSet View レイアウト / ズーム / 保存仕様 決定事項

更新日: 2026-04-15
対象: FlashCard-Master の CardSet View 周辺 (`displayMode`, `interactionMode`, `cardLayoutMode`, `zoom`, titlebar UI, split 可否, local 保存)

---

## 1. この文書の目的

CardSet View の表示・編集まわりについて、会話中に確定した仕様を取りこぼしなくまとめる。

この文書では以下を扱う。

- 軸の定義と正式名称
- モード切替 UI
- `cardLayoutMode` の仕様
- `zoom` の扱い
- window サイズ / meta panel 制約時の挙動
- local 保存方針
- fallback / disabled 条件
- 初期値
- 命名方針
- 実装時の責務分離
- 未決事項

---

## 2. 正式な軸の定義

以下の4軸は**すべて独立軸**とする。

### 2.1 `displayMode`

- 正式値: `fixed | fluid`
- 意味:
  - `fixed`: カード表示
  - `fluid`: 最大表示
- 備考:
  - `card` という語は不要
  - 正式には `fixed | fluid` を使う

### 2.2 `interactionMode`

- 正式値: `view | edit`
- 意味:
  - `view`: 閲覧
  - `edit`: 編集

### 2.3 `cardLayoutMode`

- 正式値: `flip | stack | split`
- 意味:
  - `flip`: 1カラム裏表切替
  - `stack`: 1カラム縦並び
  - `split`: 2カラム横並び

### 2.4 `zoom`

- UI 上の正式値: `0〜100` のパーセンテージ
- 備考:
  - `zoom` は独立軸
  - ただし、**実際に表示できる大きさ**は window サイズや `cardLayoutMode` 等に制約される

---

## 3. 軸の独立性ルール

以下はすべて独立であり、ある軸の変更が他軸の保存値を暗黙に変更してはならない。

- `displayMode`
- `interactionMode`
- `cardLayoutMode`
- `zoom`

### 3.1 禁止事項

- `cardLayoutMode` を変えたから `zoom` の保存値を書き換える
- `meta panel` を開いたから `zoom` の保存値を書き換える
- `window` を狭めたから `cardLayoutMode=split` の保存値を書き換える
- `displayMode` 変更時に別軸の設定を勝手に初期化する

### 3.2 許可されること

- 表示制約により、**実際の描画だけ**小さくする
- 表示制約により、**実際の表示レイアウトだけ** fallback する
- ただし保存値は変えない

---

## 4. モード切替 UI の原則

### 4.1 切替 UI の場所

モード切替の入口は**titlebar 上のアイコン**に統一する。

### 4.2 titlebar 上で切り替えるもの

以下をすべて titlebar 上のアイコンで切り替える。

- `interactionMode`
- `displayMode`
- `cardLayoutMode`

### 4.3 操作方法

- **タップ / クリックのみ**で切り替える
- dropdown を正式導線にしない
- 他の導線が残る場合も、主要導線は titlebar アイコンに統一する

### 4.4 `flip` の扱い

- `flip` は `cardLayoutMode` の1モードである
- `flip` を選ぶのは titlebar アイコン
- `flip` 中の面切替操作は別仕様として扱う

---

## 5. `cardLayoutMode` の仕様

### 5.1 `flip`

- front/back のうち**1面だけ表示**する
- view/edit どちらでも成立する正式モードとする

### 5.2 `stack`

- front/back を**縦に並べる**
- 順序は基本的に
  - 上: front / question
  - 下: back / answer

### 5.3 `split`

- front/back を**横に2カラムで並べる**
- ただし物理的に成立しない画面幅ではそのまま表示してはならない

### 5.4 同一カード内の余白

- 同一カードの front/back 間は**隣接**させる
- 対象:
  - `stack` 内の上下の面間
  - `split` 内の左右の面間
- 原則:
  - **同一カード内 gap は 0**

### 5.5 別カード間の余白

- 別カード同士の余白は**現行の card list / pager 側の余白を維持**する
- `same card gap = 0` と `different cards gap = 維持` を分けて扱う

---

## 6. `split` の成立条件と無効化

### 6.1 基本方針

`split` は「選べる状態」であっても、画面幅・window サイズ・meta panel 状態によっては物理的に成立しないことがある。

そのため `split` は**成立可否を判定する**。

### 6.2 `split` 不成立時の UI

- `split` ボタンは **disabled** にする
- disabled は**色を薄くして分かるようにする**
- hover しない
- `cursor-not-allowed`
- `disabled` / `aria-disabled` を付ける
- disabled 時の補助文言は**不要**

### 6.3 既に `split` 選択中に不成立になった場合

window リサイズや meta panel 開閉により、後から `split` が不成立になる場合がある。

その場合:

- 表示は自動で `stack` または `flip` に切り替える
- どちらに切り替えるかは**設定可能**
- fallback 先の default は **`flip`**

### 6.4 `split` 不成立の判定式方針

最終式は実装時に resolver に集約するが、考え方は以下。

#### 6.4.1 使用する値

- `viewportWidthPx`
- `pagerPaddingInlinePx`
- `metaPanelOpen`
- `metaPanelWidthPx`
- `scrollbarReservePx`
- `displayMode`
- `interactionMode`
- `split` の 0% 基準幅

#### 6.4.2 実装指針

まず「今使える横幅」を出す。

```ts
usableWidthPx =
  viewportWidthPx -
  pagerPaddingInlinePx * 2 -
  scrollbarReservePx -
  (metaPanelOpen ? metaPanelWidthPx : 0) -
  safetyInsetPx;
```

次に、`split` に必要な最低幅を決める。

```ts
splitMinRequiredWidthPx = split の 0% 基準幅 + 必要なら fixed 用バッファ
```

その上で:

```ts
canUseSplit = usableWidthPx >= splitMinRequiredWidthPx;
```

### 6.5 `fixed` 用バッファ

`fixed` は箱物の外観・余白・スケール事情でギリギリ判定だと壊れやすいため、必要なら**安全バッファ**を足す。

初期値案:

- `FIXED_LAYOUT_SAFETY_ALLOWANCE_PX = 24`

意味:

- `fixed` は「理論上ぴったり収まる幅」では危ない
- そのため、split 必須幅に若干余裕を足す

---

## 7. zoom の正式仕様

### 7.1 zoom の意味

- `zoom` は常に **0〜100 の UI 値**として扱う
- この 0〜100 は「ユーザーが指定する正規化された設定値」である

### 7.2 0% の意味

- 0% は**mode ごとの最小基準幅 px**に対応する
- これは定数で持つ
- 後から変更可能にする

### 7.3 100% の意味

- 100% は**その瞬間に画面上で表示可能な最大幅 px**に対応する
- これは可変である
- 以下に依存して都度変わる
  - window サイズ
  - `displayMode`
  - `cardLayoutMode`
  - `interactionMode`
  - meta panel 開閉
  - pager padding
  - scrollbar 領域

### 7.4 zoom の見た目と描画の関係

ユーザーが見ている `zoomPercent` と、実際に描画で使うサイズは分ける。

- `zoomPercent`
  - 0〜100
  - local に保存する
  - titlebar に表示する
- 実際の描画サイズ
  - 今の表示制約に応じて決まる
  - 保存しない
  - UI の数値表示にも直接出さない

### 7.5 自動縮小

画面制約で収まらない場合:

- 描画だけ自動で縮小する
- ただし `zoomPercent` 自体は変更しない
- titlebar の表示値も変更しない

### 7.6 zoom の式の考え方

#### 7.6.1 理想幅

`zoomPercent` からまず「理想とする表示幅 px」を作る。

考え方:

- 0% -> mode ごとの最小基準幅
- 100% -> 現在の最大表示可能幅
- その間を線形補間

#### 7.6.2 実表示幅

理想幅が現在の制約内に収まるならそのまま使う。

収まらない場合:

- 自動縮小して表示可能な最大幅で描く

### 7.7 zoom の保存値と描画値の扱い

- 保存するのは `zoomPercent` のみ
- 実効描画幅は保存しない
- 制約による縮小は一時的なものとみなす

---

## 8. zoom の local 保存

### 8.1 保存場所

- `zoom` は **local 保存**
- server 同期しない

### 8.2 保存スコープ

以下を含める。

- `deviceScope`
- `cardSetId`
- `displayMode`
- `interactionMode`
- `cardLayoutMode`

### 8.3 理由

- `edit` と `view` は使い方が異なる
- `fixed` と `fluid` でも使い方が異なる
- `flip / stack / split` でも使い方が異なる
- 端末依存の UI なので local の方が自然

---

## 9. `cardLayoutMode` の local 保存

### 9.1 保存場所

- `cardLayoutMode` は **local 保存**
- server 同期しない

### 9.2 保存スコープ

以下を含める。

- `deviceScope`
- `cardSetId`
- `displayMode`
- `interactionMode`

### 9.3 理由

- `fixed` / `fluid` で最適なレイアウトは変わり得る
- `view` / `edit` でも最適なレイアウトは変わり得る
- 端末依存なので local の方が要件に合う

---

## 10. `deviceScope`

### 10.1 方針

- 端末ごとの差を持ちたいので **local 保存**とする
- `deviceScope` は現時点では「そのローカル実行環境単位」で扱う
- 厳密な server 上の端末IDは不要

### 10.2 運用方針

- 同一ローカル環境内で設定を保存
- 別端末 / 別インストール / 別ブラウザ環境には自動同期しない

---

## 11. meta panel / window サイズの扱い

### 11.1 基本方針

meta panel の開閉や window リサイズは、zoom と layout 可否判定に影響する。

### 11.2 meta panel 幅

コード上の基準幅は CSS token で以下。

```css
--ui-panel-width: calc(320px * var(--ui-scale));
```

従って、基準値は **320px × uiScale** とする。fileciteturn95file0L1-L1

### 11.3 meta panel 開閉時の挙動

- 画面制約で収まらなくなったら、自動縮小する
- `zoomPercent` は変えない
- titlebar の値も変えない
- 挙動の考え方は window リサイズ時と同じ

### 11.4 window サイズ変更時の挙動

- usable width を再計算する
- 100% 相当の最大表示幅を再計算する
- 必要なら自動縮小する
- 必要なら `split` 可否を再判定する

---

## 12. インジケータ仕様

### 12.1 表示する内容

インジケータは出す。

表示文言:

- `画面制約で縮小中`

### 12.2 表示タイミング

- 画面制約で自動縮小中
- サイズ変更中
- サイズ変更後、数秒間継続表示

### 12.3 表示しないもの

- disabled 用の補助文言は不要

---

## 13. 命名方針

### 13.1 `displayMode`

- 正式値は `fixed | fluid`
- `card` は使わない

### 13.2 `cardLayoutMode`

- 正式値は `flip | stack | split`

### 13.3 `interactionMode`

- 正式値は `view | edit`

### 13.4 zoom

- UI 上は `0〜100%`
- 内部で px 幅へ変換する

---

## 14. 初期値方針

### 14.1 0% 基準幅

後で変更できるよう定数化して持つ。

暫定初期値:

```ts
const ZOOM_MIN_BASE_WIDTH_PX = {
  view: {
    flip: 360,
    stack: 360,
    split: 760,
  },
  edit: {
    flip: 400,
    stack: 400,
    split: 840,
  },
} as const;
```

### 14.2 初期 zoom 値

`view` と `edit` は分ける。
後から変更できるよう定数化して持つ。

暫定初期値:

```ts
const ZOOM_DEFAULT_PERCENT = {
  view: {
    flip: 62,
    stack: 58,
    split: 42,
  },
  edit: {
    flip: 52,
    stack: 48,
    split: 30,
  },
} as const;
```

### 14.3 `split` fallback 先初期値

- default: `flip`
- 設定で `stack` に変更可能

---

## 15. 実装責務のまとめ方

### 15.1 方針

判定ロジックは**1か所に集約する**。

### 15.2 集約対象

少なくとも以下は共通 resolver / hook に寄せる。

- usable width 計算
- 0% / 100% 対応幅の解決
- `zoomPercent -> 理想幅 px` 変換
- 自動縮小要否判定
- `split` 可否判定
- `split` 不成立時の fallback 先決定
- disabled 判定

### 15.3 理由

これを各 component に散らすと以下が起きる。

- toolbar と実表示で判定がズレる
- zoom 判定と layout 判定がズレる
- meta panel 開閉時の挙動がバラける
- split ボタンの disabled と実表示が一致しない

---

## 16. 旧設定・移行方針

### 16.1 方針

利用ユーザーは本人のみを前提とする。

### 16.2 ルール

- 旧設定の残骸は**なるべく残さない**
- 新しい key へ寄せる
- 必要なら移行時に古い key を整理する
- 不要な fallback key は増やしすぎない

---

## 17. コード上で既に確認できている事実

### 17.1 meta panel 幅

- `--ui-panel-width: calc(320px * var(--ui-scale))` が定義済み。fileciteturn95file0L1-L1

### 17.2 workspace shell での meta panel 位置

- `CardWorkspaceShell` は `var(--ui-panel-width)` を使って meta toggle / overlay 位置を計算している。fileciteturn96file0L1-L1

### 17.3 現在の zoom 実装

- `useCardSetViewZoom` は viewport 幅から zoom bounds を出しているが、現時点では `cardLayoutMode` を考慮していない。fileciteturn91file0L1-L1

### 17.4 現在の zoom 境界式

- `resolveZoomBounds` は `viewportWidthPx / canonicalCardWidthPx` ベースで `maxZoomPercent` を出している。fileciteturn92file0L1-L1

### 17.5 現在の split 崩れの本質

- 現状は gap を潰しても、split の可否判定や zoom 上限が 1カラム前提のままなので、重なりが発生する。fileciteturn79file0L1-L1

---

## 18. 暫定実装用の定数案

後で調整しやすいよう、最初は以下で始める。

```ts
const META_PANEL_BASE_WIDTH_PX = 320;
const SCROLLBAR_RESERVE_PX = 16;
const FIXED_LAYOUT_SAFETY_ALLOWANCE_PX = 24;

const ZOOM_MIN_BASE_WIDTH_PX = {
  view: {
    flip: 360,
    stack: 360,
    split: 760,
  },
  edit: {
    flip: 400,
    stack: 400,
    split: 840,
  },
} as const;

const ZOOM_DEFAULT_PERCENT = {
  view: {
    flip: 62,
    stack: 58,
    split: 42,
  },
  edit: {
    flip: 52,
    stack: 48,
    split: 30,
  },
} as const;
```

---

## 19. 未決事項

### 19.1 `split` disabled の厳密閾値

考え方は決まっているが、最終的に使う正確な数値は今後の調整対象。

調整対象:

- `scrollbarReservePx`
- `fixedSafetyAllowancePx`
- `split` 0% 基準幅

### 19.2 `flip` 中の面切替操作の最終 UI

本ドキュメントでは `flip` を layout mode として定義したが、front/back 切替の最終操作仕様の細部は別途詰めてもよい。

### 19.3 インジケータの具体的な表示位置

- titlebar 近傍
- overlay 上
- 他

は最終実装時に決める余地あり

---

## 20. 最終まとめ

本仕様の中核は以下。

1. `displayMode`, `interactionMode`, `cardLayoutMode`, `zoom` は独立軸
2. `cardLayoutMode` / `zoom` は local 保存
3. `zoom` は 0〜100 の UI 値
4. 0% は mode ごとの最小基準幅、100% はその瞬間の最大表示幅
5. 表示制約で収まらない時は、zoom 値を変えずに自動縮小
6. `split` が成立しない時はボタンを disabled 表示
7. 既に `split` 選択中なら `flip` または `stack` に自動 fallback
8. `meta panel` と `window size` は zoom / layout 可否判定に組み込む
9. 判定ロジックは1か所に集約する
10. 旧設定の残骸はなるべく残さない
