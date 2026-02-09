# 一問一答モードのカード背景白地化 実装計画

## 概要
ユーザー要望「一問一答モードで、カード1枚の単位が分かるようにカードごとの背景を白くする」に対応します。
現在 `OneQAMode.jsx` では、背景色 `bg-slate-50/50` の上に複数の `CardEditor` が並んでいますが、カード自体の境界が曖昧なため、各エディタを白背景のコンテナで明確に区切ります。

## 変更内容

### src/Pages/OneQAMode.jsx

`Draggable` 内の `CardEditor` をラップしている `div` (またはその親) にスタイルを追加します。

- **変更前**:
  背景指定なし（透明）、ドラッグ時のみスタイル適用。
- **変更後**:
  常に `bg-white`, `rounded-[32px]`, `border border-slate-200/60`, `shadow-sm` を適用。
  これにより、各フォームが「1枚のカード」として視覚的に認識できるようになります。

```jsx
<div
  ref={provided.innerRef}
  {...provided.draggableProps}
  className={`relative group transition-all ${snapshot.isDragging ? 'z-50' : ''}`}
>
  {/* コネクタ線などはそのまま */}
  
  {/* カードコンテナ */}
  <div className={cn(
    "relative", // 位置調整用
    "bg-white rounded-[32px] border border-slate-200/60 shadow-sm", // 白背景・境界線・影を追加
    "p-2 md:p-6", // 内部パディング (モバイル/デスクトップ)
    "pt-12 md:pt-6", // モバイルは上部にアクションボタンがあるため余白多め
    snapshot.isDragging ? 'shadow-2xl ring-2 ring-primary-500/20 scale-[1.02]' : '' // ドラッグ時の強調
  )}>
    <CardEditor ... />
  </div>
</div>
```

## 検証計画

### 手動検証
1.  **一問一答モードを開く**
    - フォルダ画面から「一問一答モード」で新規作成を開始。
2.  **表示確認**
    - 各設問（Q1, Q2...）が白いカード状の背景に乗って表示されていることを確認。
    - 背景のグレー (`bg-slate-50/50`) と明確に区別できることを確認。
    - モバイル表示時、上部のドラッグ/削除ボタンとコンテンツが重ならないよう適切なパディング (`pt-12`) が効いているか確認。
3.  **ドラッグ＆ドロップ**
    - 並べ替え時もスタイルが崩れないことを確認。
