# カード高さ設定の永続化と他画面への反映修正

エディタで調整したカードの高さが、閲覧画面、学習画面、およびエディタ内のプレビュー表示に正しく反映されるように修正します。

## 現状の課題
- `CardEditorPane.tsx` でリサイズハンドルを操作しても、その高さが `UserSettings` に保存されていない。
- `CardEditorPane.tsx` から閲覧用の `Flashcard` コンポーネントに `cardHeightPx` が渡されていない。
- 画面遷移後にエディタを開き直した際、以前調整した高さが復元されない（または初期値に戻る）。

## 修正内容

### [CardEditorPane.tsx](file:///c:/FlashcardMaster/src/Components/folder/CardEditorPane.tsx)

#### 1. 高さ設定の初期化と同期
- `useUserSettings` から `settings` と `updateSettings` を取得。
- `useEffect` を追加し、`settings.cardEditorHeightPx` または `localStorage` から `cardHeightPx` を初期化。
- `settings.cardEditorHeightPx` が外部から更新された（またはロードされた）場合に `cardHeightPx` を同期。

#### 2. 高さ変更時の保存
- `CardShell` の `onHeightChange` 内で、`setCardHeightPx` だけでなく `updateSettings({ cardEditorHeightPx: newHeight })` を呼び出し、データベースへ永続化する。
- 予備として `localStorage` にも保存する。

#### 3. プレビューへの反映
- 描画ロジックの非編集モード（`Flashcard` コンポーネント）に対し、`editorSharedHeightPx={cardHeightPx}` と `lockCardHeight={true}` を渡す。

### [Flashcard.tsx](file:///c:/FlashcardMaster/src/Components/card/Flashcard.tsx)
- 渡された `editorSharedHeightPx` が `CardShell` まで正しく伝播していることを再確認（既存実装で対応済みの想定）。

## 検証計画

### 手動確認
1. カードエディタでカードの高さをリサイズハンドルで変更する。
2. そのまま「保存」ボタンなどを押さなくても、隣のカード（裏面など）やプレビュー画面に切り替えた際に高さが維持されているか確認。
3. 一度別のページに遷移してから戻り、エディタや閲覧画面で先ほどの高さが維持されているか確認。
4. 学習画面（Study）を開き、設定した高さでカードが表示されるか確認。

### 自動テスト
- `npx tsc --noEmit` で型チェックを行い、props の渡し間違いなどがないことを確認。
