## tests/unit/components/card/blocks/MarkdownBlock.test.tsx

- [ ] 初期状態はプレビューだけで、textarea/dialogは存在しない
- [ ] 「Markdownを編集」クリックでDialogが開き、textareaに現在値が入る
- [ ] 編集して閉じるとプレビューに反映され、Dialog/textareaはDOMから消える
- [ ] 単改行(softbreak)が <br> として反映される
- [ ] コードフェンスが pre > code としてレンダリングされる
- [ ] GFMのリスト/打ち消しが崩れない
- [ ] Dialogを閉じた後、カード内DOMはプレビューのみ
- [ ] プレビュー要素がレンダリングされる
- [ ] 空Markdownに閉じたcode fenceを貼るとcodeブロック1つで置換される
- [ ] markdown+code混在を貼ると分割して置換される

## tests/unit/components/pdf/PdfOverlayToolbar.test.tsx

- [ ] 幅に合わせるボタンを表示し、fitMode が width のとき active になる
- [ ] disabled のとき幅に合わせるボタンを押せない
- [ ] レイアウト切り替えボタンは単一表示から2枚表示へ切り替える
- [ ] レイアウト切り替えボタンは2枚表示から単一表示へ切り替える
- [ ] ページ数が 1 のときレイアウト切り替えボタンを押せない

## tests/unit/components/pdf/usePdfOcr.test.tsx

- [ ] PDF identity が未解決の間は永続化済み OCR record を保持する
- [ ] active cache を削除せずに resolved document key ごとの OCR retention を trim する
- [ ] 低品質 native text では拡張 profile で OCR を再試行し、最良の試行を永続化する
