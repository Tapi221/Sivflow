# カード背景への罫線適用実装計画

カードの両面（質問側・回答側）に、学習ダッシュボートで使用されているものと同じ罫線背景を適用します。

## Proposed Changes

### [Component Name] Card Components

#### [MODIFY] [Flashcard.tsx](file:///c:/FlashcardMaster/src/Components/card/Flashcard.tsx)
- カードの表面（質問側）および裏面（回答側）の両方に、`.bg-ruled` クラスを持つ背景レイヤーを表示するように修正します。
- `CardShell` 内のコンテンツエリアの背面に絶対配置で配置し、既存のコンテンツを邪魔しないように `z-index` を調整します。

```tsx
/* イメージ */
<div className="absolute inset-0 bg-ruled opacity-100 pointer-events-none z-0" />
```

## Verification Plan

### Automated Tests
- 現状、UIの背景に関する自動テストはないため、ブラウザツールを使用して目視確認を行います。

### Manual Verification
1. 学習画面またはフォルダ内のカード一覧でカードを表示する。
2. カードの表面（質問側）に、24px間隔の薄い罫線が表示されていることを確認する。
3. カードを反転させ、裏面（回答側）にも同様に罫線が表示されることを確認する。
4. ダークモードやモバイル表示など、異なる環境でもデザインが崩れていないか確認する。
