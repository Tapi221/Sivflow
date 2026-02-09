# 長文数式・JSON文字列のUI/UX最適化設計案

モバイル対応を前提としたWebアプリにおける、KaTeX数式および長文JSON（コード）の表示・編集に関する最適化案を提案します。

## 1. 編集用 UI と表示用 UI の分離設計

### 設計方針: "Context-Aware" Rendering
編集時は「情報の網羅性と操作性」、表示時は「読みやすさと一覧性」を最優先します。

- **表示用 UI (Display Mode)**:
    - **カード内一覧**: 内容が一定量（例: 5行以上または特定文字数以上）を超える場合、下部をグラデーションでフェードアウトさせ、「もっと見る」ボタンで展開する。
    - **全画面表示/詳細ビュー**: 全ての情報を表示するが、横スクロールを避けるために強制的な折り返しを適用する。
- **編集用 UI (Edit Mode)**:
    - **インライン編集**: 1行から開始し、入力に応じて自動で高さが伸びる `AutoResizeTextarea` を使用。
    - **フォーカス/拡大編集**: 複雑な数式や長文JSONの場合、専用のモーダルまたはフルスクリーンエディタを提供し、プレビューをリアルタイムで横または下に並べて表示する。

## 2. 横スクロールを発生させない CSS 設計

横スクロールはモバイルでのユーザー体験を著しく損なう（誤操作の原因になる）ため、徹底的に排除します。

### コード/JSON用 (CodeRenderer)
`white-space: pre-wrap` を基本とし、必要に応じて `word-break` を調整します。

```css
.code-container pre {
  /* 1. 改行を維持しつつ、端で折り返す */
  white-space: pre-wrap !important;
  /* 2. 英単語の途中でも、どうしても必要な場合は折り返す */
  word-break: break-all;
  /* 3. 単語の途中での折り返しを許容し、URLなどの長文に対応 */
  overflow-wrap: anywhere;
}
```

### KaTeX数式用 (MathRenderer)
KaTeXのデフォルトでは数式は1行に収まろうとしますが、これをCSSで制御します。

```css
.katex-display {
  /* 横スクロールを許可する場合（現状）*/
  /* overflow-x: auto; */

  /* 横スクロールを禁止し、折り返す場合 */
  overflow-x: visible !important;
  white-space: normal !important;
}

.katex-display > .katex {
  /* 数式内の要素に折り返しを促す */
  white-space: normal !important;
}

/* 長い数式の場合に自動でフォントサイズを縮小するアプローチ */
.math-container {
  display: block;
  width: 100%;
  overflow: hidden;
  /* Container Queryが使える場合、幅に応じてフォントサイズを調整 */
  container-type: inline-size;
}
```

## 3. 一覧表示用の省略表示（Ellipsis）＋詳細展開 UI 案

カード形式のUIでは、一部のコンテンツが極端に長いと全体のバランスが崩れます。

- **実装案**:
    - `max-height` を設定し、`overflow: hidden` で隠す。
    - コンテナの底に `background: linear-gradient(to bottom, transparent, white)` を重ね、内容が続いていることを示唆する。
    - 「続きを読む / Expand」ボタンを中央または右下に配置。
    - 展開時はスムーズなアニメーション（`framer-motion` 等）を使用し、レイアウトシフトを最小限にする。

## 4. KaTeX 特有の注意点と対策

KaTeXは高度なレイアウト計算を行うため、単純なCSS折り返しだけでは不十分な場合があります。

- **物理的な分割**: 非常に長い数式（`a + b + c + ... + z`）は、KaTeXの `align` 環境や `\\` 手動改行を推奨するか、アプリ側で文字列を解析して `displayMode` を考慮した分割を行う。
- **Scaling (縮小反映)**: 折り返しが不自然になる複雑な行列などの場合、CSSの `zoom`（非推奨）や `transform: scale()` を使用して、コンテナ幅に収まるように自動縮小するロジックをJSで実装する。
- **フォントサイズの動的調整**: モバイル端末ではデフォルトで `clamp(1rem, 5vw, 1.5rem)` 等を使い、画面幅に応じて読みやすいベースサイズを維持する。

## 5. 実運用を想定したベストプラクティス

1. **JSONの整形**: 保存時にJSONを整形（Pretty-print）せず、表示時のみ整形して見やすくする。
2. **コピー機能の提供**: 折り返されて読みづらい場合でも、ワンクリックでクリップボードにコピーして外部エディタで見られるようにする（実装済み）。
3. **アクセシビリティ**: 折り返しによって数式の意味が損なわれないよう、拡大表示機能を補完的に提供する。

---

以上の設計に基づき、まずは `MathRenderer` と `CodeRenderer` のCSS修正から着手します。
