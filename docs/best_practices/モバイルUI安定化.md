# モバイルWeb UI安定化：テクニカルガイドライン (v1.0)

大規模モバイルWebアプリにおいて、デバイス間の表示差異や「横揺れ・ガタつき」を防ぎ、堅牢なUIを構築するための設計・実装指針です。

---

## 1. 原因：なぜPCでは起きず、モバイルで起きるのか？

モバイルブラウザにはPCと異なり「可動するUI（アドレスバー）」と「予測不可能なレンダリング要件」が存在します。

- **動的なビューポートの変化**: アドレスバーの表示/非表示により、スクロール中に `height` が数px単位で変動し、`100vh` を基準にしたレイアウトが「跳ねる」現象が発生します。
- **スクロールバーの仕様差**: 
    - PC: スクロールバーが「幅（width）」を持ち、コンテンツを押し込む。
    - モバイル: スクロールバーが「オーバーレイ」であり、幅を持たない。
    - **結果**: `100vw` を使うと、PCではスクロールバー分はみ出し（横スクロール発生）、モバイルでは一見正常だが、ある条件下で1pxのズレを生む。
- **iOSの自動調整**: iOS Safariはアクセシビリティのため、横向きにした際などにフォントサイズを自動拡大（Text Size Adjust）し、意図せぬ改行とはみ出しを招きます。
- **タップ特性**: タップ時のハイライトや、300ms遅延（現在はほぼ解消）などの挙動が、レイアウトの計算に微妙な影響を与えることがあります。

---

## 2. 確認方法：原因を特定する「3種の神器」

### A. 全要素アウトライン化 (Overflow Hunting)
横揺れが発生している場合、どの要素が「犯人（はみ出し源）」か特定します。
```css
/* ブラウザのコンソールで実行 */
* { outline: 1px solid red !important; }
```
### B. リモートデバッグ
シミュレーターでは、アドレスバーの挙動を完全には再現できません。
- **iOS**: Mac Safari -> 開発 -> [デバイス名]
- **Android**: Chrome -> `chrome://inspect/#devices`

### C. Chrome DevTools "Device Mode" の盲点
「デバイスの枠」を表示しているだけでは不十分です。**"Throttle"**（通信制限）をかけながら、コンテンツの読み込み中にレイアウトレイアウト・シフト（CLS）が起きていないかを確認します。

---

## 3. 修正方針：実運用で壊れない設計ルール

### A. ビューポートの鉄板設定
`viewport-fit=cover` はiPhoneのノッチ（セーフエリア）対応に必須です。
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

### B. 「100vw/100vh」の禁止と置換
- **横幅**: `100vw` は使用せず、`100%` を基本とします。
- **高さ**: `100vh` ではなく、新しいビューポート単位（`svh`, `lvh`, `dvh`）を使用します。

### C. Box Sizing の統一
すべての要素を `border-box` に固定します。paddingやborderによる「太り」を排除します。

---

## 4. 実装例：最低限入れるべきグローバルCSSセット

```css
/* -------------------------------------------------------------------------
   Global Stability Base
   ------------------------------------------------------------------------- */

:root {
  /* Dynamic Viewport Height のフォールバック */
  --vh: 1vh; 
}

*, *::before, *::after {
  box-sizing: border-box; /* padding/borderによるはみ出しを防止 */
  -webkit-tap-highlight-color: transparent; /* タップ時の青枠を消す */
}

html, body {
  /* 横揺れの最終防衛ライン。ただし、根本原因（はみ出し要素）は別途修正すること */
  overflow-x: hidden; 
  /* iOSでの意図せぬフォント拡大を防止 */
  -webkit-text-size-adjust: 100%;
  /* スムーズなスクロール（慣性スクロール）の有効化 */
  -webkit-overflow-scrolling: touch;
  
  width: 100%;
  min-height: 100dvh; /* 動的アドレスバーに対応した高さ */
  margin: 0;
  padding: 0;
}

/* -------------------------------------------------------------------------
   Layout: Central Column Model
   ------------------------------------------------------------------------- */

.app-container {
  width: 100%;
  max-width: 480px; /* モバイルメインのアプリなら、PC表示時に中央寄せするための制限 */
  margin: 0 auto;
  min-height: 100dvh;
  position: relative;
  background-color: #ffffff;
  /* ノッチ（セーフエリア）対策 */
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

---

## 5. 将来バグりにくい設計ルール (Do's & Don'ts)

### ❌ やってはいけない (Don'ts)
- **`width: 100vw;`**: スクロールバーを含めて計算するため、PC/モバイル混在環境で必ずズレます。
- **`absolute` 要素の `right: -20px;`**: 親要素が `overflow: hidden` でない限り、画面全体の横幅を広げてしまいます。
- **固定ピクセル幅 (`width: 375px;`)**: デバイス幅の多様化（SEの320pxからPro Maxの430px超）に対応できません。

### ✅ 推奨される設計 (Do's)
1. **中央カラム + max-width**: 
   - モバイルでは `width: 100%`。
   - タブレット/PCでは `max-width: 600px` 程度で中央寄せする設計が、ロジック変更なしで最も安定します。
2. **Flexbox/Gridের活用**:
   - `width` を直接指定するのではなく、`flex: 1;` や `gap` を活用して「余った領域を埋める」設計にします。
3. **画像とMedia**:
   - `img { max-width: 100%; height: auto; }` は必須。
4. **Input要素の `font-size: 16px`**:
   - iOS Safariはフォントが16px未満だとフォーカス時にズームします。これを防ぐためにモバイルのinputは等倍以上にします。

---

## 6. 実装の Tips: JavaScriptによる高さ補正

`dvh` が未対応の古いブラウザ向けに、JavaScriptで高さを補正するテクニックです。

```javascript
const setFillHeight = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// 画面回転やリサイズ時に再計算
window.addEventListener('resize', setFillHeight);
setFillHeight();

/* CSS側での利用 */
/* .main-view { height: calc(var(--vh, 1vh) * 100); } */
```
