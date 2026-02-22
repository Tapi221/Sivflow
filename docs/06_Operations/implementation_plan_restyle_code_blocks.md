# コードブロックのスタイリング調整

カード内のコードブロック（`<pre><code>`）の主張が強く、本文（問題文）を圧食しているため、タイポグラフィ階層と余白を調整して、より控えめで洗練されたデザインに変更します。

## 修正内容

### [CodeRenderer.tsx](file:///c:/FlashcardMaster/src/Components/card/CodeRenderer.tsx)

#### 1. ラッパーのデザイン変更
- 背景色・枠線・角丸の調整: `rounded-xl border border-slate-200/70 bg-amber-50/35 px-4 py-3`
- 1行コードでも間延びしないよう、縦余白（py）を従来の指定から、よりコンパクトなものへ見直します。

#### 2. タイポグラフィの調整
- フォントサイズ: `text-[14px]` (約14px)
- 行間: `leading-5` (20px)
- 本文（16px）より一段下げて、補足情報としての役割を強調します。

#### 3. 言語バッジの最適化
- 配置: 右上に絶対配置 (`absolute right-3 top-3`)
- 挙動: `pointer-events-none` にして、コピーや選択の邪魔にならないようにします。
- デザイン: 円形または丸みを帯びた控えめなラベルに変更します。

### [index.css](file:///c:/FlashcardMaster/src/index.css)

#### 1. 2重スクロールバーの解消
- `.code-editor-no-scroll textarea` および `.code-editor-no-scroll pre` の `overflow-x` を `hidden !important` に変更。
- ラッパーである `.code-editor-no-scroll` 自身が `overflow-x: auto` を持っているため、内部要素のスクロールを抑制することで2重表示を解消します。

### [CodeBlockEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/CodeBlockEditor.tsx)

#### 1. エディタ内スタイリングの同期
- `fontSize: 14`, `lineHeight: '20px'` に変更し、表示（View）モードと完全に一致させます。
- 以前修正した `textarea` と `pre` の位置合わせを、新しい行間設定でも維持します。
- パディング設定を見直し、入力中の「箱」のサイズ感を表示時と揃えます。

#### 2. 言語選択ラベルの調整
- `SelectTrigger` の幅を `w-[80px]` 程度に広げ、"JavaScript" などの長いラベルが見切れないように調整します。
- 必要に応じてフォントサイズや文字間隔を再調整します。

## 検証計画

### 手動確認
1.  **表示モード（Flashcard画面）**:
    *   1行のコード、複数行のコードを含むカードを表示し、余白が適切（間延びしていない）であることを確認。
    *   言語バッジ（JSなど）がコードの1行目のテキストと重なっていないか、スクロールを妨げていないかを確認。
    *   本文のテキストサイズ（16px）と比較して、コードが一段小さく、控えめに見えることを確認。
2.  **編集モード（CardEditor画面）**:
    *   コードブロックを編集し、入力中に表示が崩れないことを確認。
    *   テキスト選択時のハイライト位置が文字と一致していることを確認（先日の修正の維持）。

### 自動検証
- `npm run build` を実行し、型エラーやビルドエラーが発生しないことを確認。
