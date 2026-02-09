# ブロックボタンのデザイン変更計画

## 概要
カード編集画面（`BlockEditor.tsx`）のブロック追加ボタンを、添付画像のような「柔らかい色の影（Colored Shadow）」を持つモダンなデザインに変更します。
既存のグレーのボーダーを削除し、各機能（テキスト、画像、音声など）のテーマカラーに合わせた影（Glow Effect）を適用することで、視認性と美観を向上させます。

## 変更内容

### 1. `src/Components/card/BlockEditor.tsx` の修正

- **共通スタイルの変更**:
    - `border border-slate-200/60` を削除。
    - `bg-white` は維持。
    - `shadow-sm` を削除し、カラーごとのカスタムシャドウ（`shadow-lg` + 各色のshadow color）を適用。
    - ホバー時の挙動を調整（影を少し濃くする、または拡散させる）。

- **各ボタンのスタイル定義**:
    - **テキスト (Text)**: Default: `shadow-slate-200`, Hover: `shadow-primary-500/20`
    - **コード (Code)**: Default: `shadow-slate-200`, Hover: `shadow-indigo-500/30`
    - **画像 (Image)**: Default: `shadow-slate-200`, Hover: `shadow-emerald-500/30`
    - **音声 (Audio)**: Default: `shadow-slate-200`, Hover: `shadow-amber-500/30`
    - **リンク (Reference)**: Default: `shadow-slate-200`, Hover: `shadow-cyan-500/30`
    - **数式 (Math)**: Default: `shadow-slate-200`, Hover: `shadow-purple-500/30`

### 2. `src/Components/card/blocks/BlockWrapper.tsx` の修正
- ブロック操作ボタン（削除・複製・移動）も同様のスタイル（白背景＋淡い影）に調整します。
    - `border-slate-100` を `border-transparent` または削除。
    - `shadow-md` 相当の柔らかな影を追加。

## デザイン詳細
- **通常時**: 白背景、非常に薄い影 (`shadow-[0_2px_8px_rgba(0,0,0,0.08)]`)、ボーダーなし。
- **ホバー時**: 各機能色の影 (`shadow-[0_4px_12px_rgba(R,G,B,0.3)]`) が広がる。
- **アクティブ時**: わずかに縮小 (`scale-95`)。

## 検証手順
1. カード編集画面を開く。
2. ブロック追加ボタンが新しいデザイン（ボーダーなし、色のついた影）で表示されていることを確認する。
3. モバイル表示（アイコンのみ）とPC表示（ラベル付き）の両方でデザインが崩れていないか確認する。
4. ホバー効果が自然であることを確認する。
