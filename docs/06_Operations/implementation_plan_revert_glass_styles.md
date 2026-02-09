# 実装計画：フォルダ画面のデザイン復元（ガラススタイル解除）

フォルダ画面（`Folders.jsx`, `FolderView.jsx`, `FolderTree.tsx`）およびサイドバーに適用されていた「Liquid Glass」スタイルを解除し、元の「白ベースのフラットデザイン」に復元します。

## ユーザーレビューが必要な項目
> [!IMPORTANT]
> - 背景の画像（カスタマイズ機能含む）を削除し、元の薄いグレー（`bg-[#F8FAFB]`）のソリッド背景に戻します。
> - ガラス特有のブラー（backdrop-filter）や半透明背景をすべて削除し、白地のカード形式に戻します。

## 変更内容

### 1. ページレイアウトの復元 (`Folders.jsx`, `FolderView.jsx`)
- **背景の削除**: `backgroundImage` による背景設定を削除し、クラスを `bg-[#F8FAFB]` に変更します。
- **ヘッダー・パネルの修正**: 
  - `liquid-glass-header`, `liquid-panel`, `liquid-glass` クラスを削除。
  - `bg-white shadow-sm border border-slate-100 rounded-[28px]` (または適切な角丸) に戻します。
- **テキスト色の修正**: `text-liquid-*` クラスを `text-slate-800`, `text-slate-600`, `text-slate-400` 等に戻します。

### 2. フォルダ行の復元 (`FolderTree.tsx`)
- **スタイルのリセット**: 
  - `liquid-glass-row` を削除。
  - `bg-white border border-slate-100/50 shadow-sm p-2.5 md:p-3.5 mb-2 rounded-2xl` のような、個別の独立したカードスタイルに戻します。
- **ホバー・選択状態**: ガラス反射ではなく、標準的な `hover:bg-slate-50` やプライマリカラーのボーダーによる強調に戻します。

### 3. グローバルおよびサイドバーの修正 (`Layout.tsx`, `index.css`)
- **サイドバー**: `glass-sidebar` による条件付き分岐を削除し、常に `bg-white border-r border-slate-50` を使用するようにします。
- **CSSクリーンアップ**: `index.css` から `liquid-` 系のカスタム定義を削除（またはコメントアウト）し、コンパイル後のCSSサイズを軽量化します。

---

## 検証計画

### 自動テスト
- `npm run build` でエラーが出ないことを確認。

### 手動検証
1. **フォルダ一覧画面**:
   - 背景が画像ではなく、清潔感のある薄いグレーになっていること。
   - 各フォルダが独立した白いカードとして表示されていること。
2. **サイドバー**:
   - ガラス化せず、常に白い背景が表示されていること。
3. **他画面への影響**:
   - 以前と同様、ダッシュボードや統計画面とデザインが統一されていること。
