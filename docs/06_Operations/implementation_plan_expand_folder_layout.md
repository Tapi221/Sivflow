# フォルダ管理画面の表示領域拡大・余白削減

カラム表示などの視認性を向上させるため、画面幅の制限を緩和し、左右の余白を削減します。

## Proposed Changes

### [Page] Folders

#### [MODIFY] [Folders.jsx](file:///c:/FlashcardMaster/src/Pages/Folders.jsx)
- 外側コンテナの最大幅制限を緩和: `max-w-[1400px]` → `max-w-[1600px]`
- 外側コンテナのパディングを削減: `p-4 md:p-8` → `p-2 md:p-4`
- ヘッダー内のパディングを微調整: `p-6 md:p-8` → `p-4 md:p-6`

## Verification Plan

### Automated Tests
- ビルドが正常に通ることを確認します。
```pwsh
npm run build
```

### Manual Verification
1.  ブラウザでフォルダ一覧画面を開く。
2.  画面左右の余白が以前より狭くなり、コンテンツ（特にカラム表示）がより広く表示されていることを確認する。
3.  レスポンシブ表示（画面を狭めた際）に不自然なレイアウト崩れが起きていないか確認する。
