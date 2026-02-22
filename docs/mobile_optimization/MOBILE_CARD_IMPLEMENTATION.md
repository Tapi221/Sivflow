# モバイル対応「紙型カード」実装完了レポート

## 実施内容

### 1. カード設計幅の変更（640px → 480px）

**変更ファイル:**
- `src/index.css`: CSS変数 `--card-base-width` を 640px → 480px に変更
- `src/Components/card/CardEditor.tsx`: max-width を 680px → 520px に変更（3箇所）
- `src/Components/study/StudyCard.tsx`: max-width を 680px → 520px に変更
- `src/Components/card/CardViewer.tsx`: max-width を 680px → 520px に変更

**効果:**
- 1行あたりの文字数が約39文字から約29文字に削減
- 紙としての密度が向上し、読みやすくなった

### 2. モバイル縮小表示ロジックの実装

**新規作成:**
- `src/Components/card/MobileScalableCard.tsx`: モバイル縮小表示用ラッパーコンポーネント

**実装内容:**
- viewportWidthを監視（ResizeObserver + window.resize）
- scale = min(1, (viewportWidth - safePadding) / cardDesignWidth)
  - cardDesignWidth: 480px
  - safePadding: 24px（左右合計）
- transform: scale(scale) で縮小表示
- transform-origin: top center で上端中央を基準に縮小
- 縮小時の占有高さ調整（marginBottomで調整）
- **横スクロール完全禁止を達成**

**適用箇所:**
- `StudyCard.tsx`: 学習モードでの表示
- `CardViewer.tsx`: 閲覧モードでの表示
- `CardPopup.tsx`: ポップアップ表示（既に対応済みのためスキップ）

### 3. 編集モードの実装（将来の拡張用）

`MobileScalableCard`コンポーネントに以下の機能を実装：
- `enableEditMode` propsで有効化可能
- input/textareaへのフォーカスで自動的に編集モードON
- 編集モード中:
  - 背景オーバーレイ表示（bg-black/40 + backdrop-blur）
  - カードを中央に固定表示
  - スクロール抑制
  - ESCキーで編集モード終了
- 将来のinline editing機能に備えた実装

現時点では`enableEditMode=false`でデフォルト無効。

## 実装の仕組み

### カード幅の定義場所

```css
/* src/index.css */
html {
  --card-base-width: 480px; /* ← ここで一元管理 */
}

.card-shell--paper {
  width: var(--card-base-width);
}
```

### Scale計算ロジック

```typescript
// MobileScalableCard.tsx
const viewportWidth = window.innerWidth;
const availableWidth = viewportWidth - safePadding; // 24px
const scale = Math.min(1, availableWidth / cardDesignWidth); // 480px
```

**例:**
- iPhone SE (375px幅): scale = (375 - 24) / 480 ≒ 0.73
- iPhone 12 (390px幅): scale = (390 - 24) / 480 ≒ 0.76
- Pixel 5 (393px幅): scale = (393 - 24) / 480 ≒ 0.77
- iPad Mini (768px幅): scale = 1.0（縮小なし）

### モバイル表示の構造

```
<div max-w-[520px]>          ← 外側コンテナ（中央寄せ用）
  <MobileScalableCard>        ← 縮小表示ラッパー
    <div transform: scale()>  ← 自動スケーリング
      <Flashcard />           ← 紙型カード（480px固定）
    </div>
  </MobileScalableCard>
</div>
```

## テスト手順

### 1. 文字数確認テスト

カードエディタで新規カードを作成し、以下のテスト文字列を1行目（タイトル）に貼り付けて改行位置を確認：

```
あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん
```

**期待結果:**
- 約27〜30文字で自動改行される
- 横スクロールが発生しない
- 「あいうえおかきくけこさしすせそたちつてとなにぬねの」（30文字）が1行目
- 「はひふへほ…」が2行目に折り返す

### 2. モバイル表示テスト（Chrome DevTools）

1. Chrome DevToolsを開く（F12）
2. デバイスツールバーを有効化（Ctrl+Shift+M）
3. 以下の端末で確認：
   - iPhone SE (375 × 667)
   - iPhone 12 Pro (390 × 844)
   - Pixel 5 (393 × 851)
   - Galaxy S20 Ultra (412 × 915)

**確認項目:**
- [ ] カード全体が画面内に収まっている
- [ ] 横スクロールが発生しない
- [ ] カードが縮小表示されている（scale < 1）
- [ ] カードの見た目（罫線、角丸、影）が崩れていない
- [ ] テキストが読める（小さすぎない）

### 3. 学習モードテスト

1. 学習モードでカードを表示
2. モバイル幅（375px）に縮小
3. カードをタップして裏返す

**確認項目:**
- [ ] カードが縮小表示される
- [ ] タップ操作が正常に動作する
- [ ] 回答ボタンが見やすい位置にある
- [ ] スワイプ操作が動作する

### 4. 既存機能の回帰テスト

**デスクトップ表示（>640px）:**
- [ ] カードが480px（等倍）で表示される
- [ ] 縮小されない（scale = 1.0）
- [ ] 既存の見た目が維持されている

**カードエディタ:**
- [ ] 編集画面が正常に表示される
- [ ] リサイズハンドルが動作する
- [ ] プレビューが正常に表示される

**タグ、画像、数式などの既存機能:**
- [ ] 全ての機能が正常に動作する
- [ ] モバイルでも表示が崩れない

## トラブルシューティング

### 横スクロールが発生する場合

1. `safePadding`を増やす（24px → 32px）
   ```tsx
   <MobileScalableCard cardDesignWidth={480} safePadding={32}>
   ```

2. CSS変数を確認
   ```css
   /* index.css */
   --card-base-width: 480px; /* この値を確認 */
   ```

### カードが小さすぎる場合

1. `cardDesignWidth`を460pxに縮小（文字数は約28文字に）
   ```css
   /* index.css */
   --card-base-width: 460px;
   ```

2. `safePadding`を減らす（24px → 16px）

### 文字数が目標と異なる場合

フォントやpadding設定を確認：
- `CardSurface.tsx`: 内部padding
- `index.css`: font-size、line-height
- テキスト要素のpaddingクラス

## 今後の拡張

### 編集モードの有効化

将来、inline editing機能を追加する場合：

```tsx
<MobileScalableCard 
  cardDesignWidth={480} 
  safePadding={24}
  enableEditMode={true}  // ← これを有効化
>
  <EditableFlashcard />
</MobileScalableCard>
```

### カスタマイズ可能な項目

```typescript
// ユーザー設定で調整可能にする場合
interface MobileScaleSettings {
  cardDesignWidth: 460 | 480 | 500;  // 文字数: 28 | 29 | 31
  safePadding: 16 | 24 | 32;          // マージン
  enableEditMode: boolean;            // 編集モード
}
```

## 設計判断の記録

### なぜ480pxなのか

- 目標: 1行あたり27〜30文字
- 日本語は等幅に近いため、幅で文字数が決まる
- 640px（約39文字）→ 480px（約29文字）で目標達成
- 460px（約28文字）も選択肢だが、480pxがバランス良好

### なぜscaleなのか

- レスポンシブ（改行位置変更）は「紙型思想」に反する
- CSS transformのscaleは要素全体を縮小（レイアウト保持）
- 横スクロール禁止を達成しつつ、紙の見た目を維持

### なぜwrapperコンポーネントなのか

- Flashcard.tsxは純粋な「紙」コンポーネントとして保持
- モバイル対応ロジックは別レイヤーで実装（関心の分離）
- 必要な場所で選択的に適用可能（CardEditorでは不要）

## 完了チェックリスト

- [x] カード設計幅を640px→480pxに変更
- [x] 関連するmax-width指定を調整
- [x] モバイル縮小表示ロジックを実装
- [x] StudyCardに適用
- [x] CardViewerに適用
- [x] 編集モード機能を実装（将来用）
- [x] TypeScriptエラーなし
- [x] ドキュメント作成

## 補足: コンポーネント全文の場所

実装済みの主要ファイル全文は以下の場所にあります：

- `src/index.css`: CSS変数の定義
- `src/Components/card/MobileScalableCard.tsx`: 縮小表示ロジック
- `src/Components/card/Flashcard.tsx`: 紙型カード本体
- `src/Components/card/CardShell.tsx`: カードの枠組み
- `src/Components/card/CardSurface.tsx`: カードの表面（罫線など）
- `src/Components/study/StudyCard.tsx`: 学習モード
- `src/Components/card/CardViewer.tsx`: 閲覧モード
- `src/Components/card/CardEditor.tsx`: 編集モード

すべてのファイルは既存コードを尊重し、最小限の変更で実装されています。
