# ブロックボタンのデザイン洗練計画 (Gradient & Glassmorphism)

## 概要
添付画像に基づき、単なる影ではなく「内側から色が滲み出ているようなグラデーション」と「背景ぼかし（Glassmorphism）」を組み合わせたプレミアムなデザインを適用します。
各ボタンは半透明の白をベースに、それぞれのイメージカラーに合わせた非常に淡いグラデーションを背景に持ちます。

## 変更内容

### 1. `src/Components/card/BlockEditor.tsx` の修正
- **質感の変更**: `bg-white` ではなく、 `bg-white/80 backdrop-blur-md` を使用。
- **背景グラデーションの適用**:
  - `bg-gradient-to-br` を使用し、非常に薄い（opacity 10-20%）色から白へのグラデーションを適用します。
  - ホバー時にこのグラデーションの彩度や不透明度をわずかに上げ、発光感を演出します。
- **境界線（Border）の微調整**:
  - `border-white/40` などを使用して、エッジを立たせつつ柔らかさを維持します。

### 2. `src/Components/card/blocks/BlockWrapper.tsx` の修正
- 操作ボタン（円形）に対しても同様のグラデーション+ぼかしを適用します。
- 画像左側の青い円のように、中心から色が広がっているような質感を目指します。

## 具体的なスタイル定義 (Tailwind Classes)
- **テキスト**: `bg-gradient-to-br from-blue-50/80 to-white hover:from-blue-100 hover:to-white`
- **コード**: `bg-gradient-to-br from-indigo-50/80 to-white hover:from-indigo-100 hover:to-white`
- **画像**: `bg-gradient-to-br from-emerald-50/80 to-white hover:from-emerald-100 hover:to-white`
- **音声**: `bg-gradient-to-br from-amber-50/80 to-white hover:from-amber-100 hover:to-white`
- **リンク**: `bg-gradient-to-br from-cyan-50/80 to-white hover:from-cyan-100 hover:to-white`
- **数式**: `bg-gradient-to-br from-purple-50/80 to-white hover:from-purple-100 hover:to-white`

## 検証手順
1. ボタンが単色の白ではなく、淡い色が滲んでいるように見えるか確認。
2. 背景との境界が柔らかく、かつ立体感（グラス感）があるか確認。
3. ホバー時のアニメーションが滑らかであることを確認。
