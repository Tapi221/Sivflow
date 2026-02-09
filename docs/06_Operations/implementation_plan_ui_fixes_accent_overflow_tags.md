# UI改善実装計画

## 概要
ユーザーからの3つの改善要望に対応します。
1.  **アクセントカラーのちらつき防止**: アプリ起動時（リロード時）に初期カラー（緑）が一瞬表示されるのを防ぐため、アクセントカラーを `localStorage` にキャッシュし、同期的に適用します。
2.  **テキストの見切れ修正**: カード内の長いテキスト（空白のない日本語など）がカード幅を超えて見切れる問題を、適切な折り返し設定（`break-all` / `overflow-wrap: anywhere`）を追加して修正します。
3.  **タグと「Back to Question」の配置変更**: 現在カード内部（右上）に表示されているタグや「Back to Question」ボタンを、カードの**外側**（カードの上部など）に移動し、カード内のコンテンツ（問題文など）と被らないようにします。

## 変更内容

### 1. アクセントカラーの即時適用 (`src/contexts/ThemeContext.tsx` / `src/hooks/useUserSettings.ts`)
*   `useUserSettings` (または `ThemeContext`) でアクセントカラーが変更された際、`localStorage` にも `accent_color_cache` として保存します。
*   `ThemeContext` (または `App.tsx`) の初期化時に、DB読み込みを待たずに `localStorage` からカラーを取得して CSS 変数 (`--color-primary-600` 等) を即座にセットするロジックを追加します。
    *   `src/index.css` の `:root` (html) 定義よりも優先されるように、JS実行直後にスタイルを適用します。

### 2. テキスト見切れ修正 (`src/Components/card/Flashcard.tsx`)
*   `MathRenderer` を囲むコンテナ、または `MathRenderer` 自体のクラスに `break-all` または `overflow-wrap-anywhere` (Tailwind: `break-all` / `overlow-anywhere`) を追加します。
    *   特に `questionText` や `answerText` を表示している部分。
    *   現状: `break-words` がついているが、日本語の長文（句読点なし）では効かない場合があるため `break-all` を併用します。

### 3. タグ・ナビゲーションの配置移動 (`src/Components/card/Flashcard.tsx`)
*   現在 `<CardContent>` の中（`absolute top-2 right-2`）にある「Back to Question」ボタンと「タグ一覧」のブロックを、`<Card>` コンポーネントの**外側（上部）**に移動します。
*   構造案:
    ```tsx
    <div className="w-full flex flex-col items-center">
      {/* 新しいヘッダーエリア（カードの外） */}
      <div className="w-full max-w-[カード幅] flex justify-between items-end mb-2 px-2">
         {/* 左側：既存の編集ボタンなどをここに移動するか、カード内に残すか検討（要望は「Back...ロゴ」と「タグ」） */}
         {/* 空でもOK、またはカード内の左上要素もここに移すときれいかも？今回は指定の「Back...」と「タグ」を移動 */}
         <div /> 
         
         {/* 右側：Backボタンとタグ */}
         <div className="flex flex-col items-end gap-2">
            {isFlipped && <BackToQuestionButton />}
            <TagList />
         </div>
      </div>

      <Card>...</Card>
    </div>
    ```
*   これにより、カード内部は問題・回答テキスト表示専用となり、UIパーツとの干渉がなくなります。

## 検証計画
1.  **アクセントカラー**:
    *   設定でアクセントカラーを「ピンク」などに変更。
    *   ブラウザをリロード (F5)。
    *   一瞬「緑」にならず、最初から「ピンク」で表示されることを確認。
2.  **テキスト折り返し**:
    *   「あ」を100文字連続させたカードを作成/表示。
    *   カードの端で見切れず、次の行に折り返されていることを確認。
3.  **配置変更**:
    *   回答面（裏面）を表示。
    *   「Back to Question」ボタンとタグが、白いカード枠の**外側（上）**に表示されていることを確認。
    *   スクロールしてもカード内容と被らないことを確認。
