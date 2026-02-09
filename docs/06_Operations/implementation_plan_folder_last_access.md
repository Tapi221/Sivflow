。# フォルダ一覧「最後に触った時間」表示機能の実装計画

ユーザーが各フォルダの放置状況を一目で把握できるように、フォルダ一覧に「最後に触った時間」を表示する機能を実装します。

## ユーザーレビューが必要な事項
- 特になし。

## 変更内容

### [Component Name] Shared Utils & Types

#### [MODIFY] [Folder.ts](file:///c:/FlashcardMaster/src/types/Folder.ts)
- `Folder` 型に `lastAccessAt?: Date | Timestamp | null` を追加します。

#### [NEW] [dateUtils.ts](file:///c:/FlashcardMaster/src/utils/dateUtils.ts)
- `formatLastAccess` 関数を実装します。
    - 当日: 「今日」（アクセントカラー）
    - 1日前: 「1日前」
    - N日前: 「N日前」
    - 未アクセス: 「未学習」
- 日付境界は 0:00 を基準とします。

#### [MODIFY] [index.ts](file:///c:/FlashcardMaster/src/utils/index.ts)
- `normalizeFolder` に `lastAccessAt` の処理を追加します。

---

### [Component Name] Pages & Components

#### [MODIFY] [FolderTree.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderTree.tsx)
- `FolderItem` 内で、カード数表示の横に `lastAccessAt` を基づく情報を表示します。

#### [MODIFY] [FolderView.jsx](file:///c:/FlashcardMaster/src/Pages/FolderView.jsx)
- フォルダ詳細画面が開かれた際（`useEffect`）に、そのフォルダの `lastAccessAt` を更新します。
- 下位階層フォルダの一覧表示部分に `lastAccessAt` を基づく情報を表示します。

#### [MODIFY] [StudyMode.jsx](file:///c:/FlashcardMaster/src/Pages/StudyMode.jsx)
- 特定のフォルダで学習が開始された際（`useEffect`）に、そのフォルダの `lastAccessAt` を更新します。

## 検証計画

### 自動テスト
- `src/utils/dateUtils.test.ts` を作成してフォーマットロジックを検証します。

### 手動検証
1. フォルダ一覧を開き、対象フォルダが「未学習」であることを確認する。
2. フォルダ詳細画面を開き、一覧に戻った際に対象フォルダが「今日」になっていることを確認する。
3. 学習を開始し、一覧に戻った際に対象フォルダが「今日」になっていることを確認する。
4. システム時間を変更し、「1日前」「N日前」の表示に切り替わることを確認する。
5. モバイル表示でレイアウトが崩れていないか確認する。
