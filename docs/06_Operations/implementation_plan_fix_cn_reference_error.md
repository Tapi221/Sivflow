# 実装計画：ReferenceError: cn is not defined の修正

`OneQAMode` 画面において、`cn` ユーティリティ関数が定義されていないために発生している致命的なエラーを修正します。

## 問題の概要

`src/Pages/OneQAMode.jsx` の 183 行目で `cn` 関数が使用されていますが、インポート文が不足しているため、ランタイムエラー（ReferenceError）が発生しています。

## 変更内容

### [Component Name]

#### [MODIFY] [OneQAMode.jsx](file:///c:/FlashcardMaster/src/Pages/OneQAMode.jsx)

- `cn` を `@/lib/utils` からインポートする行を追加します。

```diff
import { Button } from '@/Components/ui/button';
+ import { cn } from '@/lib/utils';
```

## 検証プラン

### 手動確認

1. アプリケーションを起動し、「一問一答モード」に遷移する。
2. 画面が正常に表示され、コンソールに `ReferenceError: cn is not defined` が出力されないことを確認する。
3. エディタのドラッグ＆ドロップなどの操作を行い、スタイルが正しく適用されていることを確認する。
