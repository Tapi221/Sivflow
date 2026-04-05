## 対象ファイル

- `src/components/folder/components/ExplorerTreeNode.tsx` 置き換え
- `src/components/folder/components/RootFolderPanelRow.tsx` 置き換え

## `src/components/folder/components/ExplorerTreeNode.tsx`

```tsx

```

---

## 実装後の確認ポイント

1. フォルダ右クリック時に、そのフォルダが選択状態になってからメニューが開くこと
2. カードセットと文書でも同じ位置・同じ閉じ方でメニューが開くこと
3. ルート一覧側の `RootFolderPanelRow` でも右クリック実装が崩れていないこと
4. 編集中は右クリックメニューが開かないこと
5. `tsc --noEmit` で型エラーが出ないこと
6. フォルダへの PDF / PPTX ドロップが従来通り動くこと

## 確認コマンド

```bash
npm exec tsc -- --noEmit --pretty false
npm run build
```
