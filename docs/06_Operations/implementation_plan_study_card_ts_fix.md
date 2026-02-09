# 実装計画：StudyCard.tsx の TypeScript エラー修正

`StudyCard.tsx` で発生している TypeScript エラー（`preventDefaultTouchmoveEvent` が `useSwipeable` のオプションに存在しない）を修正します。

## 問題の概要
`react-swipeable` v7 では、`preventDefaultTouchmoveEvent` プロパティが削除されました。代わりに `preventScrollOnSwipe` を使用する必要があります。

## 変更内容

### Study コンポーネント

#### [MODIFY] [StudyCard.tsx](file:///c:/FlashcardMaster/src/Components/study/StudyCard.tsx)
- `useSwipeable` のオプションから `preventDefaultTouchmoveEvent: true` を削除し、`preventScrollOnSwipe: true` を追加します。

```diff
   const handlers = useSwipeable({
     onSwipedLeft: () => {
       // ...
     },
     // ...
     onSwiped: () => setSwipeDir(null),
-    preventDefaultTouchmoveEvent: true,
+    preventScrollOnSwipe: true,
     trackMouse: true
   });
```

## 検証計画

### 自動テスト
- `npm run build` を実行し、TypeScript のコンパイルエラーが解消されていることを確認します。

### 手動確認
- モバイルまたはブラウザの開発者ツールで、学習画面でのスワイプ操作が正常に機能することを確認します。
- スワイプ中に画面が上下にスクロールしないことを確認します。
