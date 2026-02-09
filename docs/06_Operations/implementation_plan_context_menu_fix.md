# カード編集画面の「続けて作成」ボタンにおけるコンテキストメニュー表示防止計画

カード編集画面で「続けて作成」ボタンを連続でクリックした際に、ブラウザの右クリックメニュー（コンテキストメニュー）が表示されてしまう問題を修正します。

## 修正内容

### [Component] [CardEditor.tsx](file:///C:/FlashcardMaster/src/Components/card/CardEditor.tsx)

- 「続けて作成」ボタンおよび「保存」ボタンに対して、以下の対応を行います。
    - `onContextMenu={(e) => e.preventDefault()}` を追加し、右クリックメニューの表示を抑制します。
    - CSSの `select-none` クラス（または `user-select: none`）を適用し、連続クリック時のテキスト選択を防止します。

## 変更ファイル

#### [MODIFY] [CardEditor.tsx](file:///C:/FlashcardMaster/src/Components/card/CardEditor.tsx)
- 「続けて作成」ボタンに `onContextMenu` 属性を追加。
- 「保存」ボタンにも同様の対応。

## 検証計画

### 手動確認
- カード作成画面を開く。
- 「続けて作成」ボタンを右クリックし、メニューが表示されないことを確認。
- 「続けて作成」ボタンを高速で連続クリックし、メニューが表示されないことを確認。
- 「保存」ボタンについても同様の確認を行う。

---
> [!NOTE]
> `window.location.reload()` によるリロード中にクリックが発生している可能性もありますが、まずはボタン側で標準の動作を抑制することで、ユーザー体験の向上を図ります。
