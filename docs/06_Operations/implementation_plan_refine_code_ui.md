# 実装計画：コードブロックのデザイン刷新とカード表示切れの修正

コードブロックの見た目を「Claude風」に洗練させるとともに、ウィンドウサイズによってカードの端が見切れてしまうレイアウトの問題を解消します。

## ユーザーレビューが必要な項目
> [!IMPORTANT]
> **フォントの維持**: アプリ全体のフォント設定には一切手を加えません。コードブロック内部のデザインと、カードエディタのレイアウト枠組みのみを調整します。

---

## 提案される変更

### 1. コードブロックの見た目改善（Claude風）

#### [index.css](file:///c:/FlashcardMaster/src/index.css)
- **色**: `--code-bg` を黄みのないニュートラルグレー（`#f7f8f9`）に変更。`--code-border` を薄く（`rgba(0,0,0,0.06)`）設定。
- **密度**: 行高さ（`line-height: 20px`）とフォントサイズ（14px）を維持しつつ、余白を調整。

#### [CodeRenderer.tsx](file:///c:/FlashcardMaster/src/Components/card/CodeRenderer.tsx)
- 背景を `bg-zinc-50/70` 等のニュートラルなものに変更。
- **言語ラベル**: 左上に `absolute` 配置。`text-[11px]`、`bg-zinc-900/5` の薄いチップ形式へ。ホバー時のみ不透明度を上げる演出を適用。
- **余白**: `px-4 py-3` に縮小。

#### [CodeBlockEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/CodeBlockEditor.tsx)
- パディング設定を `padding="24px 16px 10px 16px"` に縮小し、表示側と同期。
- 言語選択（Select）の見た目を表示側のラベルと整合させる。

---

### 2. カードの表示切れ（見切れ）修正

#### [CardEditorPane.tsx](file:///c:/FlashcardMaster/src/Components/folder/CardEditorPane.tsx)
- **横幅の統一**: `PaperCardScaleFrame` の `baseWidth` を `520` から `480` (アプリ標準) に変更。これにより、狭い画面でもカードが縮小しやすくなります。
- **レイアウトの安定**: カードが2枚並ぶグリッドの `gap` を調整し、親コンテナに適切な `max-width` を設定して中央寄せを徹底。

---

## 検証計画

### 自動検証
- `npm run build` を実行し、ビルドエラーがないことを確認。

### 手動確認事項
- [ ] **見た目**: コードの背景が黄ばんでおらず、枠や余白が締まって見えるか。
- [ ] **ラベル**: 左上の言語ラベルが控えめで、コードの邪魔をしていないか。
- [ ] **レスポンシブ**: ブラウザのウィンドウを狭めた際、カードが中央に維持され、片方の端が見切れる現象が解消されているか。
