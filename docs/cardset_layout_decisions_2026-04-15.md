# CardSet View レイアウト / ズーム / 保存仕様 決定事項

更新日: 2026-04-17  
対象: FlashCard-Master の CardSet View 周辺 (`displayMode`, `interactionMode`, `cardLayoutMode`, `zoom`, titlebar UI, split 可否, local 保存)

---

## 1. この文書の目的

CardSet View の表示・編集まわりについて、確定した仕様を取りこぼしなくまとめる。

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
- 旧設定移行方針

---

## 2. 正式な軸の定義

以下の4軸を定義する。

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
  - `zoom` はユーザーが指定する独立の設定値
  - ただし、**実際に表示できる大きさ**は window サイズや `cardLayoutMode` 等の制約を受ける

---

## 3. 軸の独立性ルール

以下を区別して扱う。

- `displayMode`
- `interactionMode`
- `cardLayoutMode`
- `zoom`

ただし、**保存スコープの分離**と**UI 上の軸の独立性**は同義ではない。  
この文書では、UI / state 上の軸としては独立に扱うが、`zoom` の local 保存は mode ごとに分離しない。

### 3.1 禁止事項

- `displayMode` を変えたから `zoom` の保存値を書き換える
- `interactionMode` を変えたから `zoom` の保存値を書き換える
- `cardLayoutMode` を変えたから `zoom` の保存値を書き換える
- `meta panel` を開いたから `zoom` の保存値を書き換える
- `window` を狭めたから `zoom` の保存値を書き換える

### 3.2 許可されること

- 表示制約により、**実際の描画だけ**小さくする
- 表示制約により、**実際の表示レイアウトだけ** fallback する
- `split` 不成立時に `effectiveCardLayoutMode` を fallback する
- ただし、保存された `zoomPercent` は変えない

---

## 4. モード切替 UI の原則

### 4.1 切替 UI の場所

モード切替の入口は **titlebar 上のアイコン** に統一する。

### 4.2 titlebar 上で切り替えるもの

以下をすべて titlebar 上のアイコンで切り替える。

- `interactionMode`
- `displayMode`
- `cardLayoutMode`

### 4.3 操作方法

- **タップ / クリックのみ** で切り替える
- dropdown を正式導線にしない
- 他の導線が残る場合も、主要導線は titlebar アイコンに統一する

### 4.4 `flip` の扱い

- `flip` は `cardLayoutMode` の1モードである
- `flip` を選ぶのは titlebar アイコン
- `flip` 中の面切替操作は別仕様として扱う

---

## 5. `cardLayoutMode` の仕様

### 5.1 `flip`

- front/back のうち **1面だけ表示** する
- `view` / `edit` どちらでも成立する正式モードとする

### 5.2 `stack`

- front/back を **縦に並べる**
- 順序は基本的に
  - 上: front / question
  - 下: back / answer

### 5.3 `split`

- front/back を **横に2カラムで並べる**
- ただし物理的に成立しない画面幅ではそのまま表示してはならない

### 5.4 同一カード内の余白

- 同一カードの front/back 間は **隣接** させる
- 対象:
  - `stack` 内の上下の面間
  - `split` 内の左右の面間
- 原則:
  - **同一カード内 gap は 0**

### 5.5 別カード間の余白

- 別カード同士の余白は **現行の card list / pager 側の余白を維持** する
- `same card gap = 0` と `different cards gap = 維持` を分けて扱う

---

## 6. `split` の成立条件と無効化

### 6.1 基本方針

`split` は「選べる状態」であっても、画面幅・window サイズ・meta panel 状態によっては物理的に成立しないことがある。

そのため `split` は **成立可否を判定する**。

### 6.2 `split` 不成立時の UI

- `split` ボタンは **disabled** にする
- disabled は **色を薄くして分かるようにする**
- hover しない
- `cursor-not-allowed`
- `disabled` / `aria-disabled` を付ける
- disabled 時の補助文言は不要

### 6.3 既に `split` 選択中に不成立になった場合

window リサイズや meta panel 開閉により、後から `split` が不成立になる場合がある。

その場合:

- 表示は自動で `stack` または `flip` に切り替える
- どちらに切り替えるかは **設定可能**
- fallback 先の default は **`flip`**

### 6.4 `split` 不成立の判定式方針

最終式は resolver に集約するが、考え方は以下。

#### 6.4.1 使用する値

- `viewportWidthPx`
- `displayMode`
- `interactionMode`
- `split` の必要最小幅
- 必要に応じて安全バッファ

#### 6.4.2 実装指針

まず「今使える横幅」を出す。

```ts
usableWidthPx = resolveUsablePresentationWidthPx({ viewportWidthPx })