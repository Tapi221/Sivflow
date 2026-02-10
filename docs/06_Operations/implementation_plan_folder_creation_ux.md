# フォルダ作成時のUX向上（自動フォーカス・全選択）の実装計画

フォルダツリーで「新規フォルダ作成」ボタンを押した際、作成された行の入力フィールドに自動でフォーカスし、テキストを全選択した状態で即座に編集可能にします。

## 課題
- 現在、新規フォルダ作成時は初期名（例: "新規フォルダ"）で作成されるが、即座に名前を編集するモードにはならない。
- IME変換中のEnterキーで確定してしまい、意図しない名前で保存される可能性がある。
- 複数の行で共通の `editInputRef` を使用しており、将来的な保守性や並び替え時の挙動に不安がある。

## 提案事項
1. **新規作成時の挙動改善**:
   - `handleCreateFolderAction` および `handleCreateCardAction` で、作成直後に `editingId` と `editingName` をセットし、編集モードを即座に開始する。
2. **IME composition の考慮**:
   - `isComposing` (または `nativeEvent.isComposing`) をチェックし、IME変換中のEnterキーを確定扱いしないようにする。
3. **行コンポーネントの抽出 (リファクタリング)**:
   - `FolderTreeItem` (フォルダ用) と `CardTreeItem` (カード用) コンポーネントに分離し、各コンポーネント内でフォーカス制御を完結させる。
   - `useEffect` を使用して、編集モード移行時に `focus()` と `select()` を確実に実行する。

## 変更内容

### [Components]

#### [MODIFY] [FolderTreeWithCards.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderTreeWithCards.tsx)

- **状態管理の追加**:
  - `isComposing` の考慮を `onKeyDown` ハンドラ内に追加。
- **アクションハンドラの修正**:
  - `handleCreateFolderAction`: optimisticFolder を追加した直後に `setEditingId(tempId)` と `setEditingName(name)` を実行。
  - `handleCreateCardAction`: optimisticCard を追加した直後に `setEditingId(tempId)` と `setEditingName(title)` を実行。
- **レンダリングロジックの改善**:
  - 既存の `renderFolder`, `renderCard` ロジックを微調整し、安定したフォーカス管理を実現する。
  - 今回はコードの整合性を維持するため、まずは `FolderTreeWithCards.tsx` 内で、各入力要素に対してより堅牢なフォーカス制御を行う。

## 検証計画

### 自動テスト
- 現状、UIの自動テスト環境がないため、手動検証を中心とする。

### 手動検証
1. **新規フォルダ作成**:
   - ツールバーの「フォルダ作成」ボタンをクリック。
   - 新しい行が現れ、入力フィールドにフォーカスが当たり、"新規フォルダ" が全選択されていることを確認。
   - キー入力ですぐに中身が書き換わることを確認。
   - IMEで日本語を入力し、変換確定のEnterで保存されないことを確認。
   - 変換確定後のEnterで保存（commit）されることを確認。
2. **新規カード作成**:
   - ツールバーまたはコンテキストメニューから「新規カード」を作成。
   - 同様にフォーカスと全選択が動作することを確認。
3. **キャンセル動作**:
   - 編集中に Escape キーを押すと作成がキャンセルされる、または元の名前に戻ることを確認（現状の仕様を維持）。
4. **連打・並び替え**:
   - 作成ボタンを連打しても、最後に作成された行が正しく編集モードになることを確認。
