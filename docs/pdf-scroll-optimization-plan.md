# PDFスクロール最適化 & レンダリングパフォーマンス改善

PDFビューアのスクロール時のカクつき（jank）を解消し、レンダリングパフォーマンスを全体的に改善します。

## 現状分析

現在のPDFビューアは `pdfjs-dist` のレガシービルドを使用し、`PDFViewer` による Canvas ベースのレンダリングを行っています。既に以下の最適化が導入されています：

- ✅ CSS `contain` / `content-visibility: auto` によるレイアウト分離
- ✅ ハードウェアアクセラレーション（`enableHWA: true`）
- ✅ スクロール中の `textLayer`/`annotationLayer` 非表示
- ✅ バイナリサーチによる可視ページ特定
- ✅ パッシブイベントリスナー

## 改善対象のボトルネック

調査で以下のボトルネックを特定しました：

| # | ボトルネック | 影響度 | ファイル |
|---|---|---|---|
| 1 | `getPdfVisiblePageMetrics()` が全 `.page` 要素の DOM メトリクスを同期読み取り（Layout Thrashing） | **高** | [PdfPane.tsx](file:///c:/Sivflow/src/features/pdf/PdfPane.tsx#L161-L173) |
| 2 | `contain-intrinsic-size` が固定値でページサイズ不一致時にスクロールジャンプ | **中** | [PdfPane.css](file:///c:/Sivflow/src/features/pdf/PdfPane.css#L14-L18) |
| 3 | overscan が 1 ページのみで高速スクロール時に空白が表示される | **中** | [PdfPane.tsx](file:///c:/Sivflow/src/features/pdf/PdfPane.tsx#L116) |
| 4 | スクロール中にバッファリサイズが `requestAnimationFrame` 内で毎フレーム実行 | **中** | [PdfPane.tsx](file:///c:/Sivflow/src/features/pdf/PdfPane.tsx#L484-L497) |
| 5 | `will-change: scroll-position` が常時適用でGPUメモリ常時消費 | **低** | [PdfPane.css](file:///c:/Sivflow/src/features/pdf/PdfPane.css#L7) |
| 6 | スクロール停止の閾値 160ms が短く、idle/active の切り替えが頻発 | **低** | [PdfPane.tsx](file:///c:/Sivflow/src/features/pdf/PdfPane.tsx#L115) |
| 7 | Canvas要素に常時 `translateZ(0)` が適用されGPU合成レイヤーが過剰 | **低** | [PdfPane.css](file:///c:/Sivflow/src/features/pdf/PdfPane.css#L20-L24) |

---

## 提案する変更

### 1. CSS最適化 — `contain-intrinsic-size` の動的化 & GPU最適化

#### [MODIFY] [PdfPane.css](file:///c:/Sivflow/src/features/pdf/PdfPane.css)

**変更内容：**
- `contain-intrinsic-size` に CSS カスタムプロパティを使用し、実際のページサイズに応じた推定サイズを設定可能にする
- `will-change: scroll-position` をスクロール中のみ適用に変更
- Canvas要素の `translateZ(0)` をスクロール中のみ適用に変更し、非スクロール時のGPUメモリ消費を削減
- スクロール中に `.page` の `content-visibility` を `visible` に切り替え、`content-visibility: auto` と PDF.js のバッファ管理の競合を防止

```css
/* 改善後のイメージ */
.pdf-pane__viewer .page {
  contain: layout paint style;
  content-visibility: auto;
  /* CSS変数でページごとの推定サイズを設定可能にする */
  contain-intrinsic-size: var(--pdf-page-width, 816px) var(--pdf-page-height, 1056px);
}

/* スクロール中のみwill-changeとGPU促進を適用 */
.pdf-pane--scrolling .pdf-pane__scroll-container {
  will-change: scroll-position;
}

.pdf-pane--scrolling .canvasWrapper,
.pdf-pane--scrolling canvas {
  transform: translateZ(0);
  backface-visibility: hidden;
}
```

> [!NOTE]
> デフォルト値を `816px 1056px`（US Letterの96dpi相当）に変更します。これは日本のA4サイズにもより近い比率です（現在の `1120px 792px` は横長レイアウト用の値で、一般的な縦長PDFと合いません）。

---

### 2. ページメトリクスキャッシュの改善 — Layout Thrashing の解消

#### [MODIFY] [PdfPane.tsx](file:///c:/Sivflow/src/features/pdf/PdfPane.tsx)

**変更内容：**
- `getPdfVisiblePageMetrics()` の DOM 読み取りを最適化。`pagesinit` イベントと `scalechanging` イベント時にのみ全ページメトリクスを取得し、キャッシュを更新
- スクロール中は前回キャッシュされたメトリクスを再利用し、DOMへの同期読み取りを完全に排除
- `contain-intrinsic-size` のCSS変数を `pagesinit` 時に最初のページのサイズから設定

> [!IMPORTANT]
> 現在のコードでは、`resizeVisiblePageBuffer()` に `refreshMetrics` オプションが既に存在しますが、`requestScrollOptimization()` 内で呼ばれる `resizeVisiblePageBuffer()` がデフォルト（`refreshMetrics: false`）で呼ばれても、`pageMetricCache.length === 0` の場合に自動でリフレッシュが走ります。この「長さ0チェック」を明示的なフラグ管理に変更し、意図しないDOMアクセスを完全に防止します。

---

### 3. バッファ管理の強化 — overscan 増加 & スクロール中バッファリサイズの制限

#### [MODIFY] [PdfPane.tsx](file:///c:/Sivflow/src/features/pdf/PdfPane.tsx)

**変更内容：**
- `PDF_VISIBLE_PAGE_CACHE_OVERSCAN` を `1` → `2` に増加（前後2ページ分を事前レンダリング）
- スクロール中の `resizeVisiblePageBuffer()` 呼び出しをスロットリングし、連続フレームでの呼び出しを防止
- `requestScrollOptimization()` 内では、バッファリサイズを最初のフレームのみ実行し、以降は `scheduleScrollIdle` のみ呼び出す

```typescript
// 改善値
const PDF_VISIBLE_PAGE_CACHE_OVERSCAN = 2;
```

---

### 4. スクロールイベント処理の改善 — idle遅延とスクロール停止判定

#### [MODIFY] [PdfPane.tsx](file:///c:/Sivflow/src/features/pdf/PdfPane.tsx)

**変更内容：**
- `PDF_SCROLL_IDLE_DELAY_MS` を `160` → `200` に増加し、idle/active切り替え頻度を削減
- `markScrollIdle` に `requestAnimationFrame` を追加し、メトリクスリフレッシュとバッファリサイズをペイントと同期

```typescript
const PDF_SCROLL_IDLE_DELAY_MS = 200;

const markScrollIdle = () => {
  scrollIdleTimer = null;
  if (isCancelled) return;
  // rAFでまとめてレイアウト読み取りとスタイル変更を同期
  window.requestAnimationFrame(() => {
    if (isCancelled) return;
    setScrollOptimizationActive(false);
    resizeVisiblePageBuffer(undefined, { refreshMetrics: true });
  });
};
```

---

### 5. `contain-intrinsic-size` の動的設定

#### [MODIFY] [PdfPane.tsx](file:///c:/Sivflow/src/features/pdf/PdfPane.tsx)

**変更内容：**
- `pagesinit` イベントハンドラ内で、最初のページの実際のサイズを取得し、CSS カスタムプロパティ `--pdf-page-width` / `--pdf-page-height` をビューア要素に設定
- これにより `content-visibility: auto` のサイズ推定が実際のページサイズと一致し、スクロールバーのジャンプを防止

```typescript
// pagesinit ハンドラ内
const firstPageElement = viewerElement.querySelector<HTMLElement>('.page');
if (firstPageElement) {
  const pageWidth = firstPageElement.offsetWidth;
  const pageHeight = firstPageElement.offsetHeight;
  viewerElement.style.setProperty('--pdf-page-width', `${pageWidth}px`);
  viewerElement.style.setProperty('--pdf-page-height', `${pageHeight}px`);
}
```

---

### 6. スクロール中の `content-visibility` 切り替え

#### [MODIFY] [PdfPane.css](file:///c:/Sivflow/src/features/pdf/PdfPane.css)

**変更内容：**
- スクロール中はバッファ管理されたページの `content-visibility` を `visible` に切り替え
- PDF.js のバッファが管理する「保持すべきページ」と `content-visibility: auto` の「画面外非表示」が競合してちらつきが発生する問題を防止

```css
.pdf-pane--scrolling .pdf-pane__viewer .page {
  content-visibility: visible;
}
```

---

### 7. メトリクスキャッシュの初期化保護

#### [MODIFY] [PdfPane.tsx](file:///c:/Sivflow/src/features/pdf/PdfPane.tsx)

**変更内容：**
- `pageMetricCache` が空の場合にスクロール中のバッファリサイズで意図せずDOM読み取りが走ることを防止
- `pageMetricCacheReady` フラグを導入し、キャッシュが初期化済みかどうかを明示的に管理

---

## 変更対象ファイル一覧

| ファイル | 変更種別 | 概要 |
|---|---|---|
| [PdfPane.css](file:///c:/Sivflow/src/features/pdf/PdfPane.css) | MODIFY | CSS最適化（will-change動的化、contain-intrinsic-size変数化、スクロール中GPU促進） |
| [PdfPane.tsx](file:///c:/Sivflow/src/features/pdf/PdfPane.tsx) | MODIFY | overscan増加、idle遅延増加、バッファリサイズスロットリング、メトリクスキャッシュ保護、contain-intrinsic-size動的設定 |

> [!NOTE]
> `pdfPageWindow.ts` や `pdfPerformance.ts` の変更は不要です。バイナリサーチロジックとパフォーマンス計測は現状で十分に最適化されています。

## 検証計画

### 手動検証
- 10ページ程度の小さなPDFでスクロールの滑らかさを確認
- 100ページ以上の大きなPDFでスクロールのカクつきが改善されていることを確認
- A4縦長PDFでスクロールバーのジャンプが発生しないことを確認
- ズーム変更後のレンダリングが正常であることを確認
- ブックマーク/マーク機能が正常に動作することを確認

### パフォーマンス計測
- Chrome DevTools の Performance タブでスクロール中のフレームレートを比較
- `localStorage` に `sivflow.pdf.debugPerformance` = `"1"` を設定し、Performance API のマークを確認
