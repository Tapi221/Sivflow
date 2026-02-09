# 数式ブロック デザイン改善計画

## 目標
数式ブロックのKaTeX入力欄が周囲のデザインから浮いて見える問題を解消し、プレミアムで洗練された印象を与えるように調整する。

## 現状の課題
- `AutoResizeTextarea` の背景が真っ白 (`bg-white`) であり、コンテナとの境界が画一的すぎる。
- ボーダーが標準的な `slate-200` で、モダンな「なじむ」デザインになっていない。
- フォーカス時の `purple-500` のリングが、他の要素（アクセントカラー）と必ずしも一致していない可能性がある。

## 変更内容

### `src/Components/card/blocks/MathBlock.tsx`

1.  **入力欄の背景とボーダーの調整**:
    - `bg-white` から、より透明感のある `bg-slate-50/50` または `bg-slate-50` に変更。
    - `border-slate-200` を `border-slate-100` に落とし、ホバー時やフォーカス時に浮かび上がるように調整。
    - `shadow-inner` (内側の影) を追加し、入力エリアが「凹んでいる」ような質感、あるいは清潔感のある「パス」感を出す。

2.  **フォーカス・アクセントカラーの動的対応**:
    - `focus-visible:ring-purple-500` を、可能であれば `accentColor` に基づく色に変更。
    - アクセントカラーが指定されていない場合は、デフォルトのプライマリカラーを使用。

3.  **余白とタイポグラフィの微調整**:
    - `leading-relaxed` などはそのままとし、フォント周りを読みやすく維持。

### スタイル変更案 (Tailwindクラス)
```tsx
className={cn(
  "font-mono text-sm text-slate-700 placeholder:text-slate-300",
  "border border-slate-100 rounded-xl px-3 py-2 transition-all duration-300",
  "focus-visible:ring-2 focus-visible:ring-offset-0 bg-slate-50/50 focus:bg-white focus:border-transparent",
  "shadow-inner focus:shadow-sm resize-none"
)}
```

## 検証計画

### 手動検証
1.  **視認性の確認**:
    - 通常状態、ホバー時、フォーカス時で、入力欄が不自然に浮いていないか確認。
    - 周囲の要素（ラベル等）との調和を確認。
2.  **アクセントカラーの整合性**:
    - 設定画面でアクセントカラーを変更した際、フォーカス時のリングカラーが追従するか（または調和するか）を確認。
3.  **動作確認**:
    - 数式の入力、プレビューの表示、エラーハンドリングなどの既存機能が正常に動作し続けていることを確認。
