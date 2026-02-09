# UI洗練および設定画面の改善計画

ユーザーからの要望に基づき、設定画面の操作性向上、カード閲覧画面の視認性改善、および欠落していたテーマ設定項目の復旧を行います。

## ユーザーレビューが必要な項目
- **テーマ項目の表示位置**: サイドバーの末尾（データの直前）に追加しますが、別の位置が望ましい場合はお知らせください。

## Proposed Changes

### 1. 設定画面：ブロック並び替えの軸固定
ドラッグ時に左右にブレないよう、Y軸方向のみに移動を制限します。

#### [MODIFY] [BlockOrdering.tsx](file:///c:/FlashcardMaster/src/Components/settings/BlockOrdering.tsx)
- `Draggable` の `style` プロパティを調整し、`transform` から X 軸方向の移動を強制的に除去する処理を追加します。

### 2. カード閲覧画面：リンク表示の視認性向上
リンク数を示すボタン（右下）を、より目立つボタンらしいデザインに変更します。

#### [MODIFY] [Flashcard.tsx](file:///c:/FlashcardMaster/src/Components/card/Flashcard.tsx)
- 参考リンクインジケータのスタイルを更新：
    - 背景色をプライマリカラー（アクセントカラー）に変更。
    - テキストを白抜きにし、3D的な立体感（シャドウとアクティブ時の沈み込み）を追加。

### 3. 設定画面：テーマ項目の復旧
コード内には存在するもののサイドバーに表示されていなかった「テーマ」項目を追加します。

#### [MODIFY] [SettingsDialog.jsx](file:///c:/FlashcardMaster/src/Components/settings/SettingsDialog.jsx)
- `sidebarItems` 配列に `{ id: 'theme', label: 'テーマ', icon: Moon }` を追加。

## Verification Plan

### Automated Tests
- `npm run build` を実行し、構文エラーがないことを確認。

### Manual Verification
1.  **設定画面（学習設定）**:
    - ブロックの並び替え時、マウスを左右に動かしてもアイテムが横にズレないことを確認。
2.  **カード閲覧画面（回答表示時）**:
    - 右下のリンクボタンがアクセントカラーで表示され、以前より見やすくなっていることを確認。
    - ボタンをクリックした際、わずかに沈み込むアニメーションが発生することを確認。
3.  **設定画面（全般）**:
    - サイドバーに「テーマ」が表示されていることを確認。
    - テーマ設定（ライト/ダーク/システム）やアクセントカラーの変更が機能することを確認。
