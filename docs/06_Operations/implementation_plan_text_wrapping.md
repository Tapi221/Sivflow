# テキスト回り込み不具合の改善計画

## 現状の課題
カード内に非常に長い文字列（例：スペースのない長い数字や英単語）が含まれる場合、`overflow-wrap: break-word` (Tailwindの `break-words`) だけでは不十分で、要素が親コンテナを突き抜けて表示されてしまう。
特に `MathRenderer` を通じてレンダリングされる際、KaTeX内部の構造が回り込みを抑制している可能性がある。

## 修正方針
1. **CSSルールの強化**: `overflow-wrap: break-word` に加え、より強制力の強い `word-break: break-all` または `overflow-wrap: anywhere` を検討する。
2. **インライン要素の挙動調整**: `MathRenderer` の `inline` 表示時のスタイルを調整し、親コンテナ内での回り込みを確実にする。
3. **コンテナの制約**: フレックスボックスの子要素において、`min-w-0` を付与して適切に縮小・折り返しが行われるようにする。

## 具体的な変更内容

### [Styles] Global CSS
#### [MODIFY] [index.css](file:///c:/FlashcardMaster/src/index.css)
- `.katex-display-wrapper` に `word-break: break-all;` を追加。
- `overflow-wrap: anywhere;` を追加（モダンブラウザ向け）。

### [Component] Flashcard
#### [MODIFY] [Flashcard.tsx](file:///c:/FlashcardMaster/src/Components/card/Flashcard.tsx)
- テキストや数式を表示するコンテナに `min-w-0` を追加し、フレックスボックス内でのオーバーフローを防止する。
- 非常に長いテキストの回り込みを確実にするため、`break-all` を必要に応じて適用する。

## 完了条件
- スペースのない長い文字列も、カードの端で正しく折り返される。
- 数式（ブロック）の横スクロール機能は維持される。

## 検証計画
### 手動検証
1. 編集画面で「1234567890...」のような非常に長い文字列を入力する。
2. プレビューおよび学習画面で、カードの端で折り返されているか確認する。
3. モバイル表示（ブラウザの開発者ツール）で、画面外に突き抜けていないか確認する。
