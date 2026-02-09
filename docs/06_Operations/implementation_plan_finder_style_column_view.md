# カラム表示（Column View）のデザイン刷新（Finder風・アクセントカラー適用）

添付画像のスタイルに基づき、現在のカード型レイアウトから、境界線で区切られた洗練されたリスト形式のレイアウトに刷新します。選択状態にはプロジェクトのアクセントカラーを適用します。

## Proposed Changes

### [Component] Folder Navigator

#### [MODIFY] [FolderColumn.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderColumn.tsx)
-   **コンテナ**:
    -   `bg-white/70`, `backdrop-blur`, `shadow-lg`, `rounded-3xl` を削除。
    -   `bg-white`, `border-r border-slate-200`, `w-[240px]` (または画像に近い幅) に変更。
    -   パディングを最小限に。
-   **ヘッダー**:
    -   ラベルをより控えめに、または統合。
-   **フォルダ項目**:
    -   **未選択時**: 背景なし、テキスト・アイコンはデフォルト色。ホバー時は `bg-slate-50`。
    -   **選択時**: 背景にアクセントカラー (`bg-primary-500`)、テキスト・アイコンは白 (`text-white`)。
    -   **レイアウト**: アイコン、フォルダ名を左、Chevron を右端に配置。
    -   現在の「n cards」や「最終学習日」の情報を、このミニマルなデザインに馴染ませるか、オプションで非表示にする（画像に基づき極力シンプルに）。

#### [MODIFY] [ColumnNavigator.tsx](file:///c:/FlashcardMaster/src/Components/folder/ColumnNavigator.tsx)
-   カラム間の `gap-3` を `gap-0` に変更（境界線で区切るため）。
-   コンテナ全体の背景色やボーダーを調整し、一体感のあるリストビューにする。

## Verification Plan

### Automated Tests
- ビルドが正常に通ることを確認します。
```pwsh
npm run build
```

### Manual Verification
1.  ブラウザでフォルダ一覧画面を開き、カラムビューに切り替える。
2.  デザインが添付画像のように境界線で区切られたリスト形式になっているか確認。
3.  フォルダを選択した際、背景がアクセントカラー（プロジェクト既定の緑/青系）になり、文字が白抜きになることを確認。
4.  右端の Chevron アイコンが正しく表示されているか確認。
