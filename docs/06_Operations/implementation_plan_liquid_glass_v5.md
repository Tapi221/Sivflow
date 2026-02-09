# Liquid Glass v5 実装計画（操作時のみ発動）

## 目的

常時ガラス表現を廃止し、**hover/focus/選択時のみ**Liquid Glassを発動させることで:
- 通常時は静かで読みやすいリスト
- 操作時のみ「ヌルッと」した液体感を演出
- iOS風の気持ちよさを一瞬だけ感じさせる

**制約**: UI構造・ロジック・state・API変更禁止。className・CSS調整のみ。

---

## 変更内容

### 1. `src/index.css` の修正

#### `.liquid-glass-row` を完全書き換え

**通常状態** (静かなリスト):
```css
.liquid-glass-row {
  position: relative;
  background: rgba(255, 255, 255, 0.025); /* 極薄 */
  backdrop-filter: blur(7px); /* 弱いブラー */
  -webkit-backdrop-filter: blur(7px);
  border: none;
  box-shadow: none;
  overflow: hidden;
  transition: all 200ms ease-out;
}

/* 擬似要素は通常時は非表示 */
.liquid-glass-row::before,
.liquid-glass-row::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 200ms ease-out;
  border-radius: inherit;
}
```

**操作時状態** (Liquid Glass発動):
```css
.liquid-glass-row:hover,
.liquid-glass-row:focus-visible,
.liquid-glass-row.selected {
  background: rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(18px) saturate(120%);
  -webkit-backdrop-filter: blur(18px) saturate(120%);
  box-shadow: 0 12px 30px rgba(0,0,0,0.18);
  transform: translateY(-1px);
}

/* 反射 (specular) */
.liquid-glass-row:hover::before,
.liquid-glass-row:focus-visible::before,
.liquid-glass-row.selected::before {
  background: 
    radial-gradient(circle at 18% 12%, rgba(255,255,255,0.35), transparent 55%),
    radial-gradient(circle at 85% 18%, rgba(255,255,255,0.18), transparent 60%);
  opacity: 0.5;
  mix-blend-mode: overlay;
  z-index: 2;
}

/* 下側の陰影（厚み） */
.liquid-glass-row:hover::after,
.liquid-glass-row:focus-visible::after,
.liquid-glass-row.selected::after {
  background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.18) 100%);
  opacity: 0.2;
  z-index: 1;
}
```

#### `.liquid-glass-chip` (ボタン) も同様に調整

通常時はフラット、hover時のみガラス化:
```css
.liquid-glass-chip {
  @apply relative overflow-hidden transition-all duration-200 active:scale-95 rounded-full;
  background: transparent; /* 通常時は透明 */
  border: none;
  box-shadow: none;
}

.liquid-glass-chip:hover {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
```

---

### 2. `src/Components/folder/FolderTree.tsx` の修正

選択状態時に`selected`クラスを追加:

```tsx
className={cn(
  "group flex items-center gap-2.5 p-2.5 md:p-3.5 mb-1.5 md:mb-2 cursor-pointer select-none",
  "liquid-glass-row rounded-[20px]",
  isSelected && "selected border-primary-200 bg-primary-50/10", // "selected" 追加
  snapshot?.isDragging && "z-50 scale-105",
  droppableSnapshot.isDraggingOver && "ring-2 ring-primary-100"
)}
```

**注**: `isSelected`はすでに存在する条件。`selected`クラスを追加するだけ。

---

## 検証計画

### 手動検証

1. **ビルド確認**:
   ```bash
   npm run build
   ```
   エラーなく完了すること。

2. **ブラウザ目視確認** (開発サーバー起動):
   ```bash
   npm run dev
   ```
   フォルダ画面で以下を確認:
   - 通常時: フォルダ行がほぼフラット（ガラス感なし）
   - ホバー時: 行がガラス化し、わずかに浮き上がる
   - 選択時: ガラス化が維持される
   - スクロール時: 疲れない（静かなリスト）

3. **iOS風の気持ちよさ**: 操作した瞬間だけ「ヌルッと」した質感が現れるか確認

---

## 補足

- **常時ガラス表現は廃止**: 通常時は`rgba(255,255,255,0.025)`の極薄背景のみ
- **反射・陰影は操作時のみ**: `::before`/`::after`の`opacity`を通常時`0`に
- **transition必須**: `200ms ease-out`で滑らかに
