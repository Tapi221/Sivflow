# モバイルネイティブ化（モバイル最適化）実装計画

現在の Web アプリをモバイルブラウザでネイティブアプリ感覚で使えるように改修します。

## Proposed Changes

### 1. 依存関係の追加
以下のライブラリをインストールします。
- `react-swipeable`: スワイプ操作の実現
- `vite-plugin-pwa`: PWA（Service Worker / Manifest）の自動生成

### 2. レイアウト・スクロールの改善
- `src/index.css`
    - `html, body` に `overflow-x: hidden` を徹底し、横揺れを防止。
    - `-webkit-overflow-scrolling: touch` を適用。
    - コンテンツの `max-width: 100%` を保証。
- `src/Components/card/blocks/MathRenderer.tsx`, `TextBlock.tsx`
    - 長文や数式が画面外に出ないよう、`word-break: break-all` や `overflow-x: auto`（数式のみ）を適切に配置。

### 3. タッチ操作の最適化
- `src/Components/study/StudyCard.tsx`
    - `useSwipeable` を導入。
    - 左スワイプで「覚えた」、右スワイプで「忘れた」などの操作を可能にする（設定でON/OFF可能にするのが理想だが、まずはデフォルト実装）。
    - スワイプ中のカードの移動アニメーション（透明度変化など）を追加。
- `src/Components/ui/button.tsx` または CSS
    - ボタンの最小サイズを 44px x 44px に確保。
    - フォーム入力時の「画面ジャンプ」防止のため、`scroll-margin-top` などの CSS 調整。

### 4. 画面遷移・アニメーション
- `src/App.tsx`
    - `framer-motion` の `AnimatePresence` を使用し、ページ遷移時にスライドやフェードのアニメーションを挿入。
- `src/Components/card/Flashcard.tsx`
    - カードめくり（Flip）のトランジションをより滑らかに調整。

### 5. PWA 対応
- `vite.config.ts`
    - `vite-plugin-pwa` を設定。
    - アイコン、テーマカラー、表示モード（standalone）を定義。
- `public/manifest.json`
    - モバイルホーム画面用のメタデータを設定。
- オフライン対応
    - IndexedDB（Dexie）は既存で実装済みのため、Service Worker で静的資産をキャッシュするように設定。

### 6. 入力最適化
- 各フォームコンポーネント
    - `inputmode` (numeric, email等) の適切な指定。
    - `autocomplete` の最適化。

## Verification Plan

### Automated Tests
- 現状のスイートを実行し、デグレがないか確認。
- `npm test`

### Manual Verification
1.  **ブラウザ開発者ツールのモバイルエミュレータでの確認**:
    - 横スクロールが発生していないか。
    - 数式が正しく折り返されている、またはスクロール可能か。
2.  **実機（iOS/Android）での確認**:
    - スワイプ操作でカードが切り替わるか。
    - ページ遷移アニメーションがスムーズか。
    - ホーム画面に追加してフルスクリーンで起動するか。
3.  **オフライン動作**:
    - 機内モード等のオフライン状態でページが読み込めるか。
