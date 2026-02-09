# Liquid Glass UI 実装計画

## 概要
フォルダ画面のUIをiOS風の「Liquid Glass（厚み・屈折・反射のある質感）」に変更します。
ロジックやAPIの変更は行わず、CSS追加とクラス名の変更のみで実装します。

## 対象ファイル
1. `src/index.css`: 新共通クラス `liquid-glass` および関連ユーティリティの定義
2. `src/Pages/Folders.jsx`: ヘッダー等のクラス変更
3. `src/Components/folder/FolderTree.tsx`: フォルダ行のクラス変更

## 実装詳細（CSS）

### 1. 共通クラス `.liquid-glass`
ユーザー指定の仕様に基づき実装します。

```css
.liquid-glass {
  position: relative;
  background: rgba(255, 255, 255, 0.08); /* 0.06-0.10 */
  backdrop-filter: blur(20px) saturate(120%);
  -webkit-backdrop-filter: blur(20px) saturate(120%);
  border: 1px solid rgba(255, 255, 255, 0.22); /* 0.18-0.26 */
  box-shadow: 0 18px 50px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.06);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* 内側ストローク（厚み） */
.liquid-glass::after {
  content: "";
  position: absolute;
  inset: 1px;
  border: 1px solid rgba(255, 255, 255, 0.13); /* 0.10-0.16 */
  border-radius: inherit;
  pointer-events: none;
  z-index: 2;
}

/* スペキュラ（反射） */
.liquid-glass::before {
  content: "";
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(circle at 18% 12%, rgba(255,255,255,0.28), transparent 55%),
    radial-gradient(circle at 85% 20%, rgba(255,255,255,0.18), transparent 60%),
    linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02) 45%, rgba(0,0,0,0.05));
  opacity: 0.75; /* 0.65-0.85 */
  mix-blend-mode: screen;
  pointer-events: none;
  z-index: 1;
  transition: opacity 0.3s ease;
}

/* ホバー効果 */
.liquid-glass:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}
.liquid-glass:hover::before {
  opacity: 0.85;
}

/* アクティブ効果 */
.liquid-glass:active {
  transform: translateY(0px) scale(0.995);
  transition-duration: 0.1s;
}
```

### 2. バリエーション
- **ヘッダー用**: `.liquid-glass-header` (少し濃い霧: 0.12)
- **ボタン用**: `.liquid-glass-chip` (Blur 14px, Bg 0.14)

### 3. テキスト色
- `.text-liquid-high`: `rgba(255, 255, 255, 0.88)`
- `.text-liquid-med`: `rgba(255, 255, 255, 0.62)`

## 変更箇所
- `Folders.jsx`: `.glass` -> `.liquid-glass-header`, テキストクラス置換
- `FolderTree.tsx`: `.glass-row` -> `.liquid-glass`, テキストクラス置換

## 検証
- 開発サーバーでフォルダ画面を表示
- 「液体の質感（厚み）」が感じられるか
- ホバー時の挙動（浮き上がり、輝き）
- テキストの可読性
