# Liquid Glass v2 実装計画 (脱・アクリル板)

## 目的
現状の「線が多くて眠い（アクリル板っぽい）」UIを改善し、ユーザー指摘に基づき「溶けたような」Liquid Glass質感を表現する。
**「線を減らす」「面で光らせる」「下側に溜まり（陰影）を作る」** を重点的に実施。

## 変更内容 (`src/index.css`)

### 1. 共通クラス `.liquid-glass` の刷新
- **ボーダー**: 極薄へ変更 (`rgba(255,255,255,0.08)`)
- **ベース背景**: より透明に (`rgba(255,255,255,0.06)`)
- **ブラー**: 少し弱めて自然に (`blur(16px)`)
- **シャドウ**: 拡散する柔らかい影 + 外側発光 (`0 0 0 1px rgba(255,255,255,0.05)`)

```css
.liquid-glass {
  position: relative;
  background: rgba(255, 255, 255, 0.06); /* 0.05-0.08 */
  backdrop-filter: blur(16px) saturate(120%);
  -webkit-backdrop-filter: blur(16px) saturate(120%);
  border: 1px solid rgba(255, 255, 255, 0.08); /* 極薄 */
  box-shadow: 0 14px 40px rgba(0,0,0,0.14), 0 0 0 1px rgba(255,255,255,0.05);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
```

### 2. 内側の陰影 (`::after`)
- 線による内枠を廃止し、**下方向へのグラデーション**に変更
- 液体の「溜まり」と厚みを表現

```css
.liquid-glass::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 50%, rgba(100,115,130,0.08) 100%); /* 下側にほんのり陰 */
  pointer-events: none;
  z-index: 1;
}
```

### 3. 角のスペキュラ (`::before`)
- 線反射を廃止し、**ラディアルグラデーション（面反射）**に変更
- 左上と右下（あるいは右上）にハイライトを配置

```css
.liquid-glass::before {
  content: "";
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(circle at 20% 0%, rgba(255,255,255,0.4) 0%, transparent 50%),
    radial-gradient(circle at 80% 10%, rgba(255,255,255,0.2) 0%, transparent 40%);
  opacity: 0.7;
  mix-blend-mode: overlay; /* or screen */
  pointer-events: none;
  z-index: 2;
  transition: opacity 0.3s ease;
}
```

### 4. ホバー・アクティブ効果
- **Hover**: 透明度を少し上げ (`0.06 -> 0.09`)、スペキュラ強調
- **Active**: 縮小効果

### 5. バリエーション
- `.liquid-glass-header`: 背景少し濃いめ (`0.10`)
- `.liquid-glass-chip`: ボタン用、ボーダーなし（または極薄）、丸み強調

## 適用手順
1. `src/index.css` の `.liquid-glass` ブロックを完全に置換
2. ブラウザで確認（線のうるささが消え、溶け込み感が出ているか）
