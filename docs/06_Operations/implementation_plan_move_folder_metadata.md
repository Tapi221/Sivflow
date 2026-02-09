# フォルダ管理画面：メタデータのインライン表示

## 概要
フォルダリストにおいて、現在タイトルの下に表示されている「カード枚数」と「最終学習日」を、タイトルの横（右側）に移動します。これにより、フォルダ情報の表示を1行にまとめ、さらにコンパクトにします。

## 変更内容

### Components/folder

#### [MODIFY] [FolderTree.tsx](file:///c:/FlashcardMaster/src/Components/folder/FolderTree.tsx)
- [x] 現在のレイアウト：
```jsx
// タイトル行
<div className="flex items-center gap-2 min-w-0">
  <span className="truncate ...">{folder.folderName}</span>
  {isSilent && ...}
</div>
// メタデータ行
<div className="flex items-center gap-2 mt-0.5">
  <span>{cardCount} cards</span>
  <span>• {lastAccess}</span>
</div>
```

- [x] 新しいレイアウト：
```jsx
// 統合された行
<div className="flex items-center gap-2 min-w-0 flex-wrap"> {/* flex-wrapを追加して長くなった場合の折り返しを考慮するか、あるいは truncate させるか検討 */}
  <span className="truncate ...">{folder.folderName}</span>
  
  <div className="flex items-center gap-2 text-liquid-low">
    <span className="text-[11px] font-medium">{cardCount} cards</span>
    {/* 最終学習日のロジック */}
    <span>• {lastAccess}</span>
  </div>

  {isSilent && ...}
</div>
```

※ モバイル端末など幅が狭い場合、タイトル＋メタデータが長くなるとレイアウトが崩れる可能性があるため、`flex-wrap` を検討するか、あるいは `min-w-0` と `truncate` の扱いを調整します。
ここでは、シンプルに横に並べ、はみ出す場合は折り返さずにタイトルを縮めるか、メタデータを右に寄せるなどの調整を行いますが、まずはシンプルに `gap-2` で横並びにします。
また、`flex-col` だった親要素のクラスを調整し、行の高さを抑えます。

## 検証計画
- `npm run dev` でローカル確認。
- デスクトップ表示で1行に収まっているか確認。
- モバイル表示でタイトルが長い場合に崩れないか確認。
