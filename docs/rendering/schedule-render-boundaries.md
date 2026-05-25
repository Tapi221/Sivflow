# Schedule 画面のレンダリング境界

このドキュメントは、Schedule 画面で Calendar / Timeline / Task を切り替えるときに、どこを固定し、どこだけを切り替えるかを忘れないためのメモです。

## 基本方針

Schedule 画面では、3モード切替時に画面全体を組み直さない。

Calendar / Timeline / Task の切替は URL 遷移ではなく、Schedule 画面内の `activeMode` 変更として扱う。したがって、共通の外枠・左サイドバーの固定部分・ヘッダー枠は維持し、モードごとの表示領域だけを差し替える。

## モード切替で固定するもの

以下は Calendar / Timeline / Task を切り替えても、基本的に再マウント・再構築しない。

- `CarvePanelShell`
- `CarvePanel`
- Schedule 画面の外枠
- `CalendarWorkspaceToolbar` の配置枠
- `ScheduleScreenHeaderDesktop` の配置枠
- 左サイドバー全体の配置枠
- `MiniCalendarSection`

## モード切替で差し替えてよいもの

以下は `activeMode` に応じて中身が変わってよい。

- Calendar のグリッド表示
- Timeline のグリッド表示
- Task のボード表示
- MiniCalendar より下のサイドバーリスト
  - Calendar / Timeline ではカレンダー・プロジェクト系
  - Task では ToDo リスト系
- Calendar 月表示時の `DayDetailPanel`

## MiniCalendarSection のルール

`MiniCalendarSection` は左サイドバー上部の固定 UI として扱う。

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

このコメントがあるコンポーネントに props を追加する場合は、この契約を破っていないか確認する。
