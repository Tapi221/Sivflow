# カード編集画面ヘッダーのさらなる極小化 (Ultra Compact Header)

`h-11` (44px) でも大きく感じるというフィードバックに基づき、プロ向けの制作ツールや IDE のような密度感を持たせるため、基準高さを `h-9` (36px) まで絞り込みます。

## 提案される変更点

### 1. 基準高さの再定義

- **基準**: `h-9` (36px) を採用します。これは VSCode の標準的なタブの高さ（約35px）とほぼ同等です。

### 2. [ExplorerTabs.tsx](file:///c:/FlashcardMaster/src/Components/explorer/ExplorerTabs.tsx)

- コンテナ高さを `h-9` に変更。
- タブ内の padding をさらに詰め、アイコンとアクティブ。インジケーターの距離を整理。

### 3. [CardEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/CardEditor.tsx)

- 全ヘッダー部品の `h-11` を `h-9` に置換。
- **角丸の調整**: `rounded-xl` -> `rounded-lg` (よりシャープに)。
- **フォントサイズの調整**: `text-[13px]` -> `text-[12px]` にし、情報密度を上げます。
- **トグルの軽量化**: 不要な padding を削り、最小限のヒットエリアを確保。

## 修正詳細

#### [MODIFY] [ExplorerTabs.tsx](file:///c:/FlashcardMaster/src/Components/explorer/ExplorerTabs.tsx)
- `h-11` を `h-9` に変更。

#### [MODIFY] [CardEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/CardEditor.tsx)
- `h-11` を `h-9` に、`h-9` (トグル内) を `h-7.5` 等に置換。
- padding 関連を全面的に `-1` または `-2` 程度縮小。

## 検証計画

### 手動検証
- 各種ブラウザ、各解像度でヘッダーが「細く洗練されて見える」ことを確認。
- マウス操作、タッチ操作で機能が損なわれていないかを確認。
