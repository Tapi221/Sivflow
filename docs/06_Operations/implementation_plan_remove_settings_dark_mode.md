# 設定画面の強制ダークモード廃止・デザイン統一

設定画面（SettingsDialog）およびその関連コンポーネントにおいて、強制的に適用されているダークモード（背景色：bg-slate-950等）を廃止し、アプリ全体の基調となっているライトテーマ（プレミアム感のある淡い色使い）に統一します。

## 変更の概要
設定画面が現在、アプリの他の部分と異なりダークテーマが強制的になってしまっているため、これを修正します。

## 修正内容の提案

### [Component] 設定画面およびサブコンポーネント

#### [MODIFY] [SettingsDialog.jsx](file:///c:/FlashcardMaster/src/Components/settings/SettingsDialog.jsx)
- `DialogContent` の背景色を `bg-slate-950` から `bg-[#F8FAFB]` または `bg-white` に変更。
- サイドバーの背景色を `bg-slate-900/50` から `bg-slate-50/50` に変更。
- 各セクションの `bg-white/5` (半透明白) を `bg-white` (塗りつぶし) または `bg-slate-100/50` に変更。
- テキスト色 `text-white` を `text-slate-900` に、`text-slate-400` を `text-slate-500` に修正。
- 境界線 `border-white/10` を `border-slate-200` に修正。
- 選択肢（テーマ、音声、同期等）のホバー効果や選択状態のスタイルをライトテーマ向けに調整。

#### [MODIFY] [DataRescuePanel.tsx](file:///c:/FlashcardMaster/src/Components/settings/DataRescuePanel.tsx)
- `Card` や `Button` の `bg-white/5`, `border-white/10`, `text-white` 等のダーク向けスタイルを修正。
- アイコンの背景色やテキスト色をライトテーマに合わせて調整。

#### [MODIFY] [DeviceSyncSettings.tsx](file:///c:/FlashcardMaster/src/Components/settings/DeviceSyncSettings.tsx)
- ダーク向けにハードコードされた `bg-white/5`, `border-white/10`, `text-slate-200` 等をライトモード向けに修正。
- インラインの入力フィールド (`bg-black/40`) を `bg-slate-100` 等に修正。

#### [MODIFY] [BlockOrdering.tsx](file:///c:/FlashcardMaster/src/Components/settings/BlockOrdering.tsx)
- ドラッグアイテムの背景色・境界線・影のスタイルをライトテーマ向けに調整。

## 検証プラン

### 自動テスト
- `npm run build` を実行し、ビルドエラーが発生しないことを確認。

### 手動確認
1. 設定画面を開き、背景が白基調になっていることを確認。
2. サイドバーとコンテンツ部分がライトテーマで統一されていることを確認。
3. 各タブを切り替え、すべての画面でデザインが適用されていることを確認。
4. テーマ設定の「ライト/ダーク/システム」切り替えで異常が発生しないことを確認。
