# dialog.desktop 規則

## 閉じる挙動

`dialog.desktop` 配下の dialog は、個別の閉じるボタンを持たせない。

- dialog 内に `X`、`Close`、`閉じる` などの閉じる専用ボタンを書かない。
- `DialogClose` を各 dialog の本文へ追加しない。
- 右上の閉じるボタン、独自 icon button、透明な閉じる hit area を各 dialog 実装へ追加しない。
- 閉じる状態は `open` と `onOpenChange` で親から制御する。
- 閉じる必要がある処理は `onOpenChange(false)` を呼ぶ。
- 背景クリック、Escape、外側 click などの共通 dismiss は dialog 基盤側または host 側に寄せる。
- 個別 dialog は内容、選択、保存、キャンセルなどの業務操作だけを実装する。

設定ダイアログと同じ考え方で、閉じる UI を dialog 本文に重複実装しない。閉じ方を変えたい場合は個別 dialog ではなく、共通 dialog 基盤または dialog host 側を修正する。

## 例

```tsx
const ExampleDialog = ({ open, onOpenChange }: ExampleDialogProps) => {
  const handleComplete = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Title</DialogTitle>
        </DialogHeader>
        <button type="button" onClick={handleComplete}>完了</button>
      </DialogContent>
    </Dialog>
  );
};
```

この例の `完了` は業務操作であり、閉じる専用ボタンではない。単に dialog を閉じるだけの UI は追加しない。
