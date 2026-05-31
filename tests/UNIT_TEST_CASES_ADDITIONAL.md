## tests/unit/components/card/blocks/MarkdownBlock.test.tsx

- [ ] 初期状態はプレビューだけにする
- [ ] Markdown 編集で dialog が開き現在値が入る
- [ ] 編集して閉じるとプレビューに反映される
- [ ] 単改行が改行表示になる
- [ ] コードフェンスがコードブロックになる
- [ ] GFM のリストと打ち消しが崩れない
- [ ] dialog を閉じた後はプレビューのみになる
- [ ] プレビュー要素がレンダリングされる
- [ ] 空 Markdown に code fence を貼ると code ブロックで置換される
- [ ] markdown と code の混在を貼ると分割して置換される

## tests/unit/components/folder/hooks/useExplorerDerivedData.test.ts

- [ ] folder item 集計は CardSet.folderId を使い missing cardSetId は除外する
- [ ] moveCardSetToFolder 後は古い card.folderId でも表示先フォルダが追従する
- [ ] カードを別 CardSet へ移すと Explorer の所属フォルダ集計が追従する

## tests/unit/components/ink/inkStorage.test.ts

- [ ] card と side の key で ink document を保存・読み込みする
- [ ] key が存在しない場合は指定 document にフォールバックする
- [ ] 保存済み key をクリアする

## tests/unit/components/pdf/PdfOverlayToolbar.test.tsx

- [ ] 幅に合わせるボタンを表示し active 状態を反映する
- [ ] disabled のとき幅に合わせるボタンを押せない
- [ ] レイアウト切り替えボタンは単一表示から 2 枚表示へ切り替える
- [ ] レイアウト切り替えボタンは 2 枚表示から単一表示へ切り替える
- [ ] ページ数が 1 のときレイアウト切り替えボタンを押せない

## tests/unit/components/pdf/usePdfOcr.test.tsx

- [ ] PDF identity が未解決の間は永続化済み OCR record を保持する
- [ ] active cache を削除せずに OCR retention を trim する
- [ ] 低品質 native text では拡張 profile で OCR を再試行し最良の試行を永続化する

## tests/unit/cardBlockNormalization.test.ts

- [ ] 古い legacy block arrays より canonical face blocks を優先する
- [ ] canonical face blocks が明示的に空なら legacy content を復活させない
- [ ] 未知の block type は code ではなく text にフォールバックする
