# 実装計画: テキストブロックの表示幅とスタイルの同期

## 概要
カード編集画面のテキスト入力エリアの表示（幅、フォント、折り返し位置）を、閲覧画面（Flashcard Viewer）と一致させます。
これにより、編集中の見た目と実際の表示の差異をなくします。

## 現状の差異
| 特徴 | 編集画面 (`TextBlock.tsx`) | 閲覧画面 (`Flashcard.tsx`) |
| :--- | :--- | :--- |
| **フォント** | `font-sans`, `text-base` (固定) | `font-serif`, `text-[clamp(1.125rem,4vw,1.5rem)] md:text-2xl` (レスポンシブ) |
| **最大幅** | `w-full` (制限なし) | `max-w-2xl` (約672px) |
| **配置** | 左寄せ (コンテナ一杯) | 中央配置 (`mx-auto`) |
| **折り返し** | `resize-none` | `break-all` |

## 変更内容

### [src/Components/card/blocks/TextBlock.tsx](file:///c:/FlashcardMaster/src/Components/card/blocks/TextBlock.tsx)

`AutoResizeTextarea` に適用するクラスを修正し、`Flashcard.tsx` の `renderBlocks` 内のテキスト表示スタイルと一致させます。

**変更前:**
```tsx
className="font-sans text-base text-slate-700 placeholder:text-slate-300 border-none px-3 py-1 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent resize-none"
```

**変更後:**
```tsx
className="font-serif text-[clamp(1.125rem,4vw,1.5rem)] md:text-2xl font-medium text-slate-700 leading-relaxed break-all placeholder:text-slate-300 border-none px-0 py-1 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent resize-none w-full max-w-2xl mx-auto"
```

*   `font-sans` -> `font-serif`
*   `text-base` -> `text-[clamp(1.125rem,4vw,1.5rem)] md:text-2xl`
*   `px-3` -> `px-0` (閲覧画面の親divにはpaddingがないため、テキストエリア自体も詰めるか、閲覧画面に合わせて調整。閲覧画面は親のpaddingの影響を受けるが、`max-w-2xl` のコンテナ自体にはpaddingがない)
*   追加: `w-full max-w-2xl mx-auto` (幅制限と中央寄せ)

## 検証計画

### 動作確認
1.  カード編集画面を開き、長いテキストを入力する。
2.  テキストの改行位置が、閲覧画面（裏返す、またはプレビュー）と同じになるか確認する。
3.  中央寄せ（`mx-auto`）が効いているか確認する。

### 注意事項
*   編集のしやすさを損なわないか確認（文字が大きすぎる等あれば微調整）。
*   モバイル表示での確認。
