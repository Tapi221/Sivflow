# Schedule 画面のレンダリング境界

このドキュメントは、Schedule 画面で Calendar / Timeline / Task を切り替えるときに、どこを固定し、どこだけを切り替えるかを忘れないためのメモです。

## 基本方針

Schedule 画面では、3モード切替時に画面全体を組み直さない。

Calendar / Timeline / Task の切替は URL 遷移ではなく、Schedule 画面内の `activeMode` 変更として扱う。したがって、共通の外枠・左サイドバーの固定部分・ヘッダー枠は維持し、モードごとの表示領域だけを差し替える。

## モード切替で固定するもの

以下は Calendar / Timeline / Task を切り替えても、基本的に再マウント・再構築しない。

- `AppLayout` 配下の左端 `Sidebar`
- `CarvePanelShell`
- `CarvePanel`
- `CarvePanelChrome`
- Schedule 画面の外枠
- Schedule 画面の白いパネルの背景・枠線・角丸・影
- `ScheduleScreenHeaderDesktop` の配置枠
- 左サイドバー全体の配置枠
- `MiniCalendarSection`

## モード切替で差し替えてよいもの

以下は `activeMode` に応じて中身が変わってよい。

- Calendar のグリッド表示
- Timeline のグリッド表示
- Task のボード表示
- 白いパネル内の content 領域
- MiniCalendar より下のサイドバーリスト
  - Calendar / Timeline ではカレンダー・プロジェクト系
  - Task では ToDo リスト系
- Calendar / Timeline / Task の切替ボタンの active 表示
- Calendar 月表示時の `DayDetailPanel`

## AppLayout の左端 Sidebar のルール

左端の `Sidebar` は `AppLayout` 直下にあり、Schedule 画面本体より外側の UI として扱う。

Schedule 画面の Calendar / Timeline / Task 切替は `Outlet` 内の `ScheduleScreen` の状態変更なので、左端 `Sidebar` を更新理由にしない。

### 更新してよい条件

- URL が変わったとき
- アクティブな workspace tab が変わったとき
- Sidebar の開閉状態が変わったとき
- Settings や Global Search など、Sidebar 自体の操作状態が変わったとき

### 更新理由にしてはいけないもの

- `activeMode` の変更
- Calendar / Timeline / Task の切替
- Schedule 画面内の日付選択
- Schedule 画面内の表示月変更
- Calendar / Timeline / Task の中身の再描画

### 禁止事項

- 左端 `Sidebar` に Schedule 画面内の `activeMode` を渡さない
- 左端 `Sidebar` に Schedule 画面内の `selectedDate` を渡さない
- 左端 `Sidebar` に Calendar / Timeline / Task 固有の表示状態を渡さない
- Schedule 内の mode 切替だけで URL を変更して、左端 `Sidebar` の active 判定を巻き込まない

左端 `Sidebar` を Schedule のモードごとに変えたくなった場合は、まず本当に App 全体のナビゲーション責務なのか確認する。Schedule 内だけの見た目変更なら、`ScheduleScreen` 配下の UI に閉じ込める。

## CarvePanelChrome のルール

`CarvePanelChrome` は Schedule 画面の白いパネルの見た目だけを担当する固定 UI として扱う。

白いパネルの背景・枠線・角丸・影は、Calendar / Timeline / Task の中身とは別責務にする。モードごとの中身が変わっても、白い土台の chrome を更新理由にしない。

### 更新してよい条件

- `hasTrailingPanel` が変わったとき
- パネルの角丸・枠線・影など chrome 自体の仕様が変わったとき
- レイアウト上、右詳細パネルの有無によって白い土台の形状を変える必要があるとき

### 更新理由にしてはいけないもの

- `activeMode` の変更
- Calendar / Timeline / Task の切替
- Calendar のグリッド内容変更
- Timeline のグリッド内容変更
- Task のカード・カラム内容変更
- `children` の参照変更
- タスク作成フォームやフィルターなど、白いパネル内 content の状態変更

### 禁止事項

- `CarvePanelChrome` に `children` を渡さない
- `CarvePanelChrome` に `activeMode` を渡さない
- `CarvePanelChrome` に `selectedDate` を渡さない
- `CarvePanelChrome` に Calendar / Timeline / Task 固有のデータを渡さない

白いパネル内の表示を変えたい場合は、`CarvePanelChrome` ではなく content 側のコンポーネントを変更する。

## MiniCalendarSection のルール

`MiniCalendarSection` は左サイドバー上部の固定 UI として扱う。

下の区切り線も `MiniCalendarSection` の一部として扱う。MiniCalendar と区切り線を別コンポーネントに分けると、モード切替時に境界が分かりにくくなるため。

### 更新してよい条件

- 表示月が変わったとき
- 選択日が変わったとき
- 前月・次月・日付選択をユーザーが操作したとき

### 更新理由にしてはいけないもの

- `activeMode` の変更
- Calendar / Timeline / Task の切替
- Google Calendar アカウント情報の変更
- Google Task リスト情報の変更
- サイドバー下部リストの表示内容変更

### 禁止事項

- `MiniCalendarSection` に `activeMode` を渡さない
- `MiniCalendarSection` に `selectedRange` を渡さない
- `MiniCalendarSection` に `googleAccounts` を渡さない
- `MiniCalendarSection` に Task / Calendar 固有のリスト情報を渡さない

MiniCalendar の再レンダリングが必要になった場合は、まず本当に日付表示に関係する変更か確認する。

## CalendarSidebar の責務

`CalendarSidebar` は左サイドバー全体の配置を持つ。

ただし、すべての UI を同じ責務で扱わない。

- 上部の `MiniCalendarSection` は固定領域
- 区切り線より下はモード依存領域
- 下部のアカウント追加ボタンは固定領域

`activeMode` に反応してよいのは、MiniCalendar より下のリスト表示だけ。

## ScheduleScreen の責務

`ScheduleScreen.desktop.tsx` は Schedule 画面全体の状態と配置を管理する。

- `activeMode` を持つ
- Calendar / Timeline / Task の表示切替を管理する
- 共通フレームを維持する
- モード切替時に `CarvePanelShell` を再マウントしない
- モード切替時に `CarvePanelChrome` に mode 依存 props を渡さない
- モード切替時に URL を変更しない

## URL のルール

Schedule 画面内で Calendar / Timeline / Task を切り替えても URL は変更しない。

`/schedule?mode=task` のような query は初期表示用として扱う。画面内切替のたびに query を更新しない。

## 実装時の確認ポイント

変更前に以下を確認する。

1. その props は本当に対象コンポーネントの表示に必要か
2. `activeMode` を渡さなくても責務分離できないか
3. callback 参照の変化だけで memo が外れていないか
4. 共通フレームを条件分岐の内側に入れていないか
5. モード切替時に不要な右パネル・上段行・余白が増減していないか
6. MiniCalendar のような固定 UI に mode 系 props を足していないか
7. 左端 `Sidebar` に Schedule 内部の state を渡していないか
8. Schedule 内の mode 切替だけで URL を変更していないか
9. 白いパネルの見た目変更を content 側の状態変更と混ぜていないか
10. `CarvePanelChrome` に `children` や mode 固有データを渡していないか

## コメントの書き方

再レンダリング境界を守るコンポーネントには、ファイル上部または export 直前に Render Contract を書く。

```tsx
/**
 * Render contract:
 * - Calendar / Timeline / Task の mode 切替では再レンダリングしない。
 * - 更新してよい条件は monthDate / selectedDate の変更だけ。
 * - activeMode / selectedRange / googleAccounts を props に追加しない。
 */
```

左端 `Sidebar` のように Schedule 画面の外側にある UI には、次のように考える。

```tsx
/**
 * Render contract:
 * - Schedule 画面内の Calendar / Timeline / Task 切替では更新しない。
 * - 更新してよい条件は URL / active workspace tab / Sidebar 開閉状態の変更だけ。
 * - Schedule 内部の activeMode / selectedDate / viewMode を props に追加しない。
 */
```

`CarvePanelChrome` のように白いパネルの見た目だけを持つ UI には、次のように書く。

```tsx
/**
 * Render contract:
 * - Calendar / Timeline / Task の content 切替では更新しない。
 * - 更新してよい条件は hasTrailingPanel や chrome 自体の見た目変更だけ。
 * - children / activeMode / selectedDate / mode 固有データを props に追加しない。
 */
```
