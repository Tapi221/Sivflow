# 背景画像の変更実装計画

## 概要
ユーザーから提供された画像を背景として設定します。
対象画面はフォルダ一覧 (`Folders.jsx`) およびフォルダ詳細 (`FolderView.jsx`) です。
これに伴い、既存の背景色指定 (`bg-[#F8FAFB]`) を削除し、画像が `cover` サイズで固定表示されるようにします。

## 対象ファイル
- `src/Pages/Folders.jsx`
- `src/Pages/FolderView.jsx`
- `src/assets/background.jpg` (配置済み)

## 変更内容
1.  **画像のインポート**:
    各ファイルで `import backgroundImage from '@/assets/background.jpg';` を追加。

2.  **スタイル適用**:
    ルート要素 (`div`) の `className` と `style` を変更。
    ```jsx
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed transition-all duration-500"
      style={{ 
        backgroundImage: `url(${backgroundImage})` 
      }}
    >
    ```

3.  **視認性の確認**:
    背景が暗い色調であるため、ガラスモーフィズムのパネル上のテキストの視認性を確認し、必要であれば調整を行う（今回はまずは背景適用を優先）。

## 検証計画
- ブラウザでフォルダ一覧画面を開き、背景画像が適用されているか確認。
- フォルダ詳細画面に遷移し、同様に背景が適用されているか確認。
- スクロール時に背景が固定 (`bg-fixed`) されているか確認。
