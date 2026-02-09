# 設定画面デザインの差し戻し (Revert) 計画

## 概要
ユーザーの要望「ガラスっぽいデザインになっていない、元に戻してほしい」に基づき、設定画面 (`SettingsDialog.jsx`) および関連コンポーネントのデザインを、標準的なスタイル（Solid Background）に戻します。

## 変更内容

### 1. `src/index.css`
- 追加した Glassmorphism 用ユーティリティクラス（`.glass-panel`, `.glass-sidebar`, `.glass-content`, `.glass-card`, `.glass-button`）を削除します。

### 2. `src/Components/settings/SettingsDialog.jsx`
- `DialogContent`: `glass-panel` クラスを削除し、標準の `bg-background` または `bg-slate-900` (ダークモード時) に戻します。
- レイアウト: `glass-sidebar` / `glass-content` クラスを削除し、標準の `border-r border-border` 等で区切りを表現します。
- 各タブ内のスタイル: `glass-card` を `bg-card` (または `bg-white/5` 等の既存スタイル) に戻します。

### 3. 関連コンポーネントの修正
以下のコンポーネント内の `glass-card` 等のクラスを、標準的なカードスタイル (`bg-card`, `border`, `shadow-sm`) に戻します。
- `src/Components/settings/DataRescuePanel.tsx`
- `src/Components/settings/BlockOrdering.tsx`
- `src/Components/settings/DeviceSyncSettings.tsx`

## 検証計画
- `npm run build` でビルドエラーがないことを確認。
- コードベース上で、Glassmorphism 用クラスが除去され、標準クラスに戻っていることを確認。
