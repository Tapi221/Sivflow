# IDE警告の解消およびスタイルのクリーンアップ計画

複数のファイルで報告されているIDEの警告（インラインCSSの使用、IDの重複など）を修正し、コードの品質と保守性を向上させます。

## Proposed Changes

### 1. インラインスタイルの移行
動的な値（ユーザー設定のアクセントカラーやドラッグ状態）を除き、可能な限りインラインスタイルを `index.css` のクラスまたは Tailwind CSS のユーティリティクラスに移行します。

#### [MODIFY] [index.css](file:///c:/FlashcardMaster/src/index.css)
- `CodeRenderer` 用のコードブロック基本スタイル (`.code-block-pre`) を追加。
- `CardEditor` の復旧通知用のスタイル (`.restore-notification`) を追加。
- メディアアップローダー等のプログレスバー用共通スタイル (`.progress-bar-fill`) を追加。

#### [MODIFY] [CodeRenderer.tsx](file:///c:/FlashcardMaster/src/Components/card/CodeRenderer.tsx)
- `<pre>` タグのインラインスタイルを `.code-block-pre` クラスに移行。

#### [MODIFY] [CardEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/CardEditor.tsx)
- 復旧通知エリアのスタイルを `.restore-notification` に移行し、動的部分は CSS 変数で処理。
- **重要**: `id="title-header"` を `useId` を使ったユニークなIDに変更（一問一答モードなどの複数エディタ表示時のID重複防止）。

#### [MODIFY] [MediaUploader.tsx](file:///c:/FlashcardMaster/src/Components/card/MediaUploader.tsx)
- プログレスバーのインラインスタイルをCSS変数とクラスに整理。

#### [MODIFY] [FolderMemo.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderMemo.tsx)
- ヘッダー装飾などのインラインスタイルを整理。

### 2. ID重複の解消
#### [MODIFY] [MediaUploader.tsx](file:///c:/FlashcardMaster/src/Components/card/MediaUploader.tsx)
- 重複が疑われる箇所の調査と、`useId` による確実なユニーク性の確保。

### 3. その他（ブラウザ互換性警告など）
#### [MODIFY] [index.css](file:///c:/FlashcardMaster/src/index.css)
- `text-size-adjust` や `scrollbar-width` などの警告に対し、ベンダープレフィックスの確認や必要に応じた調整（基本的には現状のままでも機能するが、警告を消す方向で検討）。

## Verification Plan

### Automated Tests
- 各コンポーネントが正しくレンダリングされるか確認。
- `npm run build` を実行し、ビルドエラーやスタイル漏れがないか確認。

### Manual Verification
1.  **CardEditor**: 復旧通知が正しい色で表示されるか確認。
2.  **CodeRenderer**: コードの折り返しやフォントが正しく適用されているか確認。
3.  **MediaUploader**: アップロード中のプログレスバーが表示されるか確認。
4.  **一問一答モード**: 複数のエディタが表示されてもID衝突によるフォーカス問題などが発生しないか確認。
