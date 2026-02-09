# KaTeX実装の最適化と統合計画 (修正版)

現在プロジェクト内に混在している KaTeX のレンダリング実装を整理し、ユーザーの要望に基づいた「安全・高速・堅牢」な実装に統一します。

## 課題
- プロジェクト内に `MathRenderer.tsx` (npm) と `MathRender.tsx` (CDN) が混在している。
- レンダリングの責務が分散しており、パフォーマンスとエラーハンドリングが不十分。
- コンポーネントごとに CSS を読み込んでおり、オーバーヘッドがある。

## 変更内容

### 1. グローバル設定の調整 (パフォーマンス重視)
- **[MODIFY] [main.tsx](file:///c:/FlashcardMaster/src/main.tsx)**
    - `katex/dist/katex.min.css` を最上位で一度だけインポートします。

### 2. MathRenderer.tsx のリファクタリング (核心部)
- **唯一のレンダリング窓口**: `katex` API を直接呼ぶのはこのコンポーネントのみに限定します。
- **描画方式**: `katex.renderToString` を使用し、React のライフサイクル外での DOM 操作を避けます。
- **計算のキャッシュ (useMemo)**: 
  - `useMemo` を使用して `latex` と `displayMode` が変更されたときのみ HTML を再生成。
  - `React.memo` と組み合わせて、不要な再レンダリングと再計算を徹底的に排除します。
- **エラーフォールバック UI**:
  - `throwOnError: false` に設定。
  - 解析エラー時は、以下のスタイルで生の LaTeX 文字列を表示します。
    - `font-family: monospace`
    - 背景色: 薄い赤色、テキスト: 警告色 (`#dc2626`)
    - ツールチップ等でエラー内容を表示（任意）

### 3. 実装の統合とクリーンアップ
- **[MODIFY] [Flashcard.tsx](file:///c:/FlashcardMaster/src/Components/card/Flashcard.tsx)**
    - CDN版の `MathRender` をリファクタリング後の `MathRenderer` に全面置換。
- **[MODIFY] [CardEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/CardEditor.tsx)**
    - 同上。
- **[DELETE] [MathRender.tsx](file:///c:/FlashcardMaster/src/Components/math/MathRender.tsx)**
    - 重複する古い CDN 版実装を削除。

## 安全性とパフォーマンス
- **🔐 セキュリティ**: `trust: false` を維持。`\htmlClass` 等の危険な拡張を無効化します。
- **🔧 パフォーマンス安全弁**: 描画結果を `useMemo` で保持し、仮想リスト等の大量表示シーンでもメインスレッドをブロックしない軽量な構造にします。

## 検証プラン
- 複雑な数式のレンダリング確認。
- 意図的な構文エラー入力によるフォールバック UI の表示確認。
- 開発者ツールによるプロパティ変更時の再計算コストの確認。
