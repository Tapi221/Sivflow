# カード編集と閲覧UIの混同および遷移不備の修正

## 1. 現状の課題
ユーザーが「カード編集画面を開いたつもりが閲覧UIになってしまう」と感じる原因は、主に以下の3点に集約されます。

1. **Desktop環境での Explorer 挙動**:
   - `Folders.jsx` において、Desktopではカードをクリックした際に `CardEdit` ページへ遷移せず、右ペインの `CardEditorPane` を表示する仕様になっている。
   - しかし、`CardEditorPane` は現在 `Flashcard`（閲覧用）のみを描画しており、編集機能を持っていない。
2. **編集ハンドラの欠落**:
   - `CardEditorPane.tsx` や `WorldMap.tsx` (の `CardPopup`) において、`Flashcard` コンポーネントに `onEdit` ハンドラを渡していない。
   - このため、閲覧UI上の「鉛筆アイコン（編集ボタン）」が表示されず、編集画面への動線が断たれている。
3. **誤解を招く命名**:
   - `CardEditorPane` という名前でありながら、実態がビューアーであるため、編集ができると期待したユーザーを混乱させている。

---

## 2. 提案する修正

### A. `src/Components/folder/CardEditorPane.tsx` の改善
- `isEditing` 状態を追加し、閲覧モードと編集モードを切り替えられるようにする。
- 閲覧モード時には `Flashcard` に `onEdit` を渡し、クリックで編集モードへ移行できるようにする。
- 編集モード時には `CardEditor` コンポーネントを表示する。

### B. `src/Pages/WorldMap.tsx` の修正
- `CardPopup` に `onEdit` ハンドラを渡し、マップ上のポップアップから編集画面（`/CardEdit?id=...`）へ遷移できるようにする。

### C. `src/Components/card/CardEditor.tsx` の復元
- ユーザーがデバッグのために追加した `showPreview` の `false` 固定などの変更を、本来の柔軟な初期化ロジック（設定に基づく同期など）に戻しつつ、不必要なプレビューの自動表示を防ぐ。

---

## 3. 修正ファイル詳細

### 1. [MODIFY] [CardEditorPane.tsx](file:///c:/FlashcardMaster/src/Components/folder/CardEditorPane.tsx)
- `CardEditor` をインポートし、`isEditing` ステートに応じて表示を切り替える。

### 2. [MODIFY] [WorldMap.tsx](file:///c:/FlashcardMaster/src/Pages/WorldMap.tsx)
- `CardPopup` の呼び出し箇所に `onEdit={(card) => navigate(createPageUrl("CardEdit?id=" + card.id))}` を追加。

### 3. [MODIFY] [CardEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/CardEditor.tsx)
- `showPreview` の初期状態や `useEffect` を整理し、プレビューの挙動を正常化する。

---

## 4. 検証計画

### 閲覧・編集の切り替え確認
1. **Desktop版 Explorer**: 
   - サイドバーでカードを選択 -> 右ペインに閲覧UIが表示されることを確認。
   - 右ペインの鉛筆ボタンをクリック -> 同じペイン内で `CardEditor` が開くことを確認。
   - 保存またはキャンセル -> 閲覧UIに戻ることを確認。
2. **ワールドマップ**:
   - カードノードをクリック -> ポップアップが開くことを確認。
   - ポップアップ内の鉛筆ボタンをクリック -> `/CardEdit` ページへ遷移することを確認。

### 動作テスト
- `npm run dev` で起動し、上記手順を手動で確認。
- 各画面でブラウザコンソールにエラーが出ていないか確認。
