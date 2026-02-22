# docs/06_Operations/implementation_plan_bottom_nav_menu.md
# メニューアイコンとボトムナビゲーション実装

## 概要

モバイル画面の下部にボトムナビゲーションバーを追加し、**予定表・ギャラリー・今日の学習**の3ページへアイコンから画面遷移できるようにした。

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/Pages/TodayStudy.jsx` | **新規作成**。今日復習すべきカードをフォルダ別に表示し、StudyMode へ遷移できる。 |
| `src/App.tsx` | `TodayStudy` を lazy import、`/today-study` ルートを追加。 |
| `src/Layout.tsx` | `ImagesIcon` を import、`currentPageName` に `TodayStudy`/`Gallery`/`Calendar` の判定追加。サイドバーに「今日の学習」リンク追加。モバイルボトムナビバーを追加。 |

## ボトムナビゲーションバー仕様

- 表示条件: `md:hidden`（モバイルのみ）、StudyMode/CardEdit/設定オープン時は非表示
- タブ3つ：今日の学習（`BookOpen`）、ギャラリー（`ImagesIcon`）、予定表（`Calendar`）
- アクティブタブはアクセントカラー（`text-primary-600`）＋背景色でハイライト
- 今日の学習にレビュー件数バッジ表示（未選択時のみ）

## ビルド確認

```
npm run build → Exit code: 0
```
