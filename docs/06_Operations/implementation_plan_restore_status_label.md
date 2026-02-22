# 実装計画：カード編集画面のステータスラベル復元

ヘッダーのスリム化に伴い消失した、カードの習熟度を示すステータスラベル（「未学習」「定着途上」「マスター」など）を復元します。ユーザーの要望通り、INDEX（Q番号）と星（ブックマーク）アイコンの間に配置します。

## ユーザーレビューが必要な項目
- ステータスラベルのサイズ感：ヘッダーの `h-9` (36px) に合わせて非常にコンパクト（高さ20px程度）になります。

## 変更内容

### カードコンポーネント

#### [MODIFY] [CardEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/CardEditor.tsx)
- カードの耐性スコア（Resistance Score）を計算し、それに基づいた `StabilityPhase` を取得するロジックを追加します。
- `INDEX / Q` ブロックと `Bookmark / Uncertainty` ブロックの間に、ステータスラベルを表示する要素を挿入します。
- グリッドレイアウトを調整し、追加された要素が適切に並ぶようにします。

```tsx
// 計算ロジック
const resistance = calculateResistanceScore(card?.interval ?? 0);
const phase = getResistancePhase(resistance);

// JSX (INDEX / Q の後)
<div className="h-9 flex items-center">
  <span className={cn(
    "text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap transition-all",
    phase.colorClass
  )}>
    {phase.label}
  </span>
</div>
```

## 検証計画

### 手動テスト
- [ ] 既存のカードを開き、「定着途上」「安定」などのラベルが Q1 と星アイコンの間に表示されることを確認。
- [ ] 新規カード作成時、既に実装済みの「新規」バッジに加え、初期状態のラベル（「未学習」など）が表示（または非表示で整合性が取れているか）を確認。
- [ ] 様々な画面幅でレイアウトが崩れないことを確認。
- [ ] ダークモード/ライトモードでの色の視認性を確認。
