# モバイル入力時のズーム防止 実装計画

## 概要
モバイルデバイス（特にiOS）において、フォントサイズが16px未満の `input`/`textarea` にフォーカスすると画面が自動的にズームされる問題を解消します。
ユーザーからの要望「テキストブロックと数式ブロックについて入力中ズームされないようにしてください」に基づき、これらの入力フォントサイズをモバイルで16px（`text-base`）以上に設定します。

## 変更内容

### 1. src/Components/card/blocks/TextBlock.tsx
現状: `className="font-sans text-base sm:text-sm ..."`
変更: `className="font-sans text-base ..."` (または `text-base md:text-sm`)
- `sm:text-sm` (640px以上で14px) だと、大型スマホの横向きやタブレット等で14pxになりズームされる可能性があるため、`md` (768px) 以上で小さくするか、常時 `text-base` とします。今回は安全策として `md:text-sm` に変更します。

### 2. src/Components/card/blocks/MathBlock.tsx
現状: `className="font-mono text-sm ..."`
変更: `className="font-mono text-base md:text-sm ..."`
- 常時 `text-sm` (14px) になっているため、モバイル（`md`未満）では `text-base` (16px) を強制します。

### 3. src/Components/ui/AutoResizeTextarea.tsx (オプション検討)
現状: `text-sm` がデフォルト。
変更: デフォルトは変更せず、呼び出し側（上記ブロック）で `className` 上書きにより対応します。これにより既存の他の入力箇所への意図しない影響を防ぎます。

## 検証計画

### 手動検証
1.  **モバイルシミュレーション（または実機）**
    - Chrome DevTools のデバイスモードでスマホ表示にする。
    - テキストブロック、数式ブロックの入力欄の `Computed` スタイルを確認し、`font-size` が `16px` になっていることを確認する。
    - 画面幅を広げて（768px以上）、`font-size` が `14px` に切り替わることを確認する。

2.  **実機動作確認（可能な場合）**
    - iOS端末等でフォーカス時にズームしないことを確認。
