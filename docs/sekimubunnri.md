前提:

```text
Web: React
Desktop: Tauri + React renderer
Mobile: React Native
iOS native: React Native の ios/ 内で必要な箇所だけ Swift
```

この構成では、**Swift 専用 app は作りません**。  
Swift は `apps/mobile/ios/Sivflow/NativeModules` や `NativeViews` に入れます。React Native アプリの一部として扱います。

```text
apps/web
  Web の起動口。
  Vite、index.html、public、PWA、Web deploy 設定。

apps/desktop
  Tauri shell。
  Rust command、window 操作、file dialog、OAuth loopback、bundle 設定。
  UI は持たない。Web renderer を WebView で表示するだけ。

apps/mobile
  React Native app。
  画面の大半は RN。
  ios/ に必要な Swift native module / native view を置く。
  android/ に必要なら Kotlin native module を置く。

functions
  Firebase Cloud Functions の実装と functions package 設定。
  src/ に function 本体を置く。
  repo 全体の運用スクリプトは置かない。

scripts
  repo 全体の運用スクリプト置き場。
  dev、verify、predeploy、functions 用の補助処理をここに置く。
  functions/scripts は作らない。

packages/web-renderer
  Web と Tauri が共有する React UI 本体。
  DOM 前提の component はここ。

packages/mobile-renderer
  React Native UI 本体。
  View/Text/Pressable/navigation など RN 前提の UI はここ。

packages/core
  全 JS 系で共有する純粋ロジック。
  domain model、usecase、validation、日付計算、card/deck ロジックなど。
  React、DOM、Tauri、Expo に依存しない。

packages/platform
  各 platform adapter の interface と実装。
  Web/Tauri/RN の違いをここで吸収する。

shared/assets
  全プラットフォーム共通の元 asset。
  app-icon.svg など。

shared/schemas
  TypeScript / Swift / Kotlin に型生成できる言語非依存 schema。

shared/design-tokens
  Web CSS / RN StyleSheet / Swift Color に変換する元。
```

## scripts と functions の責務分離

`functions/` は Firebase Cloud Functions の resource directory として扱う。Cloud Functions の実装、`functions/package.json`、`tsconfig.json`、生成される `functions.yaml` など、Firebase Functions package として必要なものだけを置く。

repo 全体の運用スクリプトは root の `scripts/` 配下に置く。`functions/scripts/` は作らない。互換用 wrapper を `functions/scripts/` に残すことも禁止する。

Firebase Functions に関係する運用スクリプトでも、実装本体ではなく manifest 生成、predeploy、検証、整形などの補助処理であれば root の `scripts/` に置く。

```text
Firebase Functions の実装
  functions/src/

Firebase Functions package 設定
  functions/package.json
  functions/tsconfig.json

Firebase Functions manifest 生成 script
  scripts/functions/generateManifest.cjs

Firebase deploy 前処理
  scripts/predeploy/firebase-predeploy.cjs

source 規約や検証 script
  scripts/verify/

開発用 watch script
  scripts/dev/
```

`functions/package.json` から root scripts を呼ぶ場合は `../scripts/...` を使う。

```text
OK: node ../scripts/functions/generateManifest.cjs
NG: node scripts/generateManifest.mjs
NG: node functions/scripts/generateManifest.mjs
```

`firebase.json` の predeploy は root の predeploy script を入口にし、`ci`、`build`、`manifest` などの実行順序は `scripts/predeploy/firebase-predeploy.cjs` 側で管理する。Firebase 設定ファイルに同じ手順を複数行で分散させない。

## constants フォルダを作らない

`constants/`、`src/constants/`、`packages/*/constants/` のような定数専用フォルダは作らない。

定数は「定数であること」ではなく、「誰の責務か」で置き場所を決める。`constants` という名前のフォルダに逃がすと、domain、UI、platform、storage、native の責務境界が消えるため禁止する。

そのファイルでしか使わない値は、そのファイル内に定義する。別ファイルに逃がさない。単一ファイル専用の値のために shared、utils、config、constants、`.constants.ts` などの置き場を作らない。

ファイル内では、import、型定義、定数、helper 関数、component 本体、memo / displayName / export の順に置く。単一ファイル専用の定数は import と型定義の後、helper 関数より前に置く。

複数ファイルで使う値だけ、責務を持つ module に昇格する。この場合は `<責務名>.constants.ts` を作ってよい。置き場所は専用 `constants` フォルダではなく、利用責務の module と同じ階層にする。

`.constants.ts` は、複数ファイルから import される値だけを置く。1 ファイルからしか import されない `.constants.ts` は作らない。昇格先は「どの platform で使うか」ではなく「どの責務の値か」で決める。

配置ルール:

```text
そのファイルでしか使わない値
  そのファイル内

複数ファイルで使う domain / usecase の値
  packages/core/src/domain/<domain>/<domain>.constants.ts
  packages/core/src/usecase/<usecase>/<usecase>.constants.ts

複数ファイルで使う Web / Desktop UI の表示値
  packages/web-renderer/src/components/<component>/<component>.constants.ts
  packages/web-renderer/src/features/<feature>/<feature>.constants.ts

複数ファイルで使う React Native UI の表示値
  packages/mobile-renderer/src/components/<component>/<component>.constants.ts
  packages/mobile-renderer/src/features/<feature>/<feature>.constants.ts
  packages/mobile-renderer/src/screens/<screen>/<screen>.constants.ts

複数ファイルで使う platform adapter の設定値
  packages/platform/src/<capability>/<capability>.constants.ts

Web 起動口だけの設定値
  apps/web/src/<責務名>.constants.ts

Tauri shell だけの設定値
  apps/desktop/src-tauri/src/<責務名>.constants.ts

Mobile app 起動口だけの設定値
  apps/mobile/src/<責務名>.constants.ts

Swift / Kotlin / TypeScript で共有したい構造
  shared/schemas/

色、余白、typography などの design token
  shared/design-tokens/

画像、icon、音声などの asset 元
  shared/assets/
```

例:

```text
NG: constants/shared/flashcard/geometry.ts
OK: packages/core/src/domain/card/cardGeometry.constants.ts

NG: constants/web/app/sidebar.ts
OK: packages/web-renderer/src/features/sidebar/sidebarLayout.constants.ts

NG: constants/web/storage/storageKeys.ts
OK: packages/platform/src/storage/storageKeys.constants.ts

NG: constants/shared/app/featureFlags.ts
OK: packages/platform/src/feature-flags/featureFlags.constants.ts

NG: src/components/card/frame/CardShell.constants.ts
    CardShell.tsx からしか使わない値を分離している
OK: src/components/card/frame/CardShell.tsx 内に定義する

OK: src/components/card/frame/cardFrame.constants.ts
    CardFrame.tsx、CardShell.tsx、MobileScalableCard.tsx など複数ファイルから使う値だけを置く
```

barrel export で `@constants` のような横断入口を作ることも禁止する。共通化したい場合は、責務を持つ module から公開する。

## iPad 手書きモードの責務分離

iPad 手書きモードは `apps/mobile` に直接全部置かない。入力体験、保存形式、表示、同期、native bridge を分けて配置する。スマホには手書きモードのナビも画面も出さない。

```text
共通Inkモデル
  packages/core/src/domain/card/ink/

Web/Desktop表示
  packages/web-renderer/src/components/ink/
  packages/web-renderer/src/features/card/ink/

iPad専用RN UI
  packages/mobile-renderer/src/screens/ipad/handwriting/
  packages/mobile-renderer/src/components/ipad/ink/

iOS native PencilKit
  apps/mobile/ios/Sivflow/NativeViews/
  apps/mobile/ios/Sivflow/NativeModules/

Desktop/Tauri通信
  apps/desktop/src-tauri/src/

Platform差分吸収
  packages/platform/src/handwriting/

言語非依存schema
  shared/schemas/
```

### 共通Inkモデル

`InkDocument`、`InkStroke`、`InkPoint`、`InkSide`、`InkTool`、正規化、clone、validation は `packages/core/src/domain/card/ink/` に置く。

ここは React、DOM、Tauri、Expo、Swift、PencilKit に依存しない。iPad と Desktop の見た目を揃えるため、保存形式は既存の Ink document 形式に統一する。

### Web/Desktop表示

HTML Canvas、Pointer Events、カード上 overlay、Web/Desktop用 toolbar は `packages/web-renderer` に置く。

Tauri Desktop は UI を持たないため、Desktop 上の Ink 表示・編集 UI は `apps/desktop` ではなく Web renderer に置く。

### iPad専用RN UI

React Native の iPad 専用画面、接続中の Desktop session 表示、iPad 手書きモード画面、iPad用 toolbar は `packages/mobile-renderer/src/screens/ipad/handwriting/` と `packages/mobile-renderer/src/components/ipad/ink/` に置く。

`apps/mobile/src/App.tsx` は起動口と navigation 接続に留め、手書き画面の本体は renderer package 側に寄せる。

スマホには手書きモードのナビも画面も出さない。`packages/mobile-renderer` は iOS / Android の React Native アプリ枠であり、手書き機能をスマホ共通機能として扱わない。

### iOS native PencilKit

PencilKit / `PKCanvasView` などの Swift 実装は `apps/mobile/ios/Sivflow/NativeViews/` に置く。

PencilKit のデータ export、InkStroke への変換、session bridge など native module 的な処理は `apps/mobile/ios/Sivflow/NativeModules/` に置く。

Swift 専用 app は作らない。React Native アプリの一部として扱う。

### Desktop/Tauri通信

LAN WebSocket server、session start/stop、Windows ファイアウォールに関係する native command は `apps/desktop/src-tauri/src/` に置く。

ただし、Desktop のボタンや表示 UI はここに置かない。Tauri は shell と native capability に限定する。

### Platform差分吸収

手書き session の interface、Desktop/Mobile/Web adapter、通信方式の差分は `packages/platform/src/handwriting/` に置く。

接続発見を cloud にするか LAN にするか、Desktop が server になるか、Mobile が client になるか、といった差分は renderer から直接扱わない。

### schema

Swift / Kotlin / TypeScript 間で型生成したい Ink document や handwriting session は `shared/schemas/` に置く。

全 platform 共通にしたいものは、可能な限り TypeScript 実装ではなく schema / token / asset に寄せる。

一番大事な教訓はこれです。

```text
Web と Tauri は renderer を共有する。
React Native は別 renderer にする。
Swift は apps/mobile/ios 配下の native extension として扱う。
functions は Firebase Functions 実装と package 設定に限定する。
repo 全体の運用スクリプトは root scripts に置く。
functions/scripts は作らない。
constants フォルダは作らず、責務を持つ module に値を置く。
そのファイルでしか使わない定数は、そのファイル内に定義する。
複数ファイルで使う定数だけ、責務 module 内の .constants.ts に置いてよい。
全 platform 共通にしたいものは TypeScript code ではなく、schema / token / asset に寄せる。
```
