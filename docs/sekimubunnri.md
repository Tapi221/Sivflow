前提:

```text
Web: React
Desktop: Tauri + React renderer
Mobile: React Native
iOS native: React Native の ios/ 内で必要な箇所だけ Swift
```

この構成では、**Swift 専用 app は作りません**。  
Swift は `apps/mobile/ios/Manifolia/NativeModules` や `NativeViews` に入れます。React Native アプリの一部として扱います。

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

## constants フォルダを作らない

`constants/`、`src/constants/`、`packages/*/constants/` のような定数専用フォルダは作らない。

定数は「定数であること」ではなく、「誰の責務か」で置き場所を決める。`constants` という名前に逃がすと、domain、UI、platform、storage、native の責務境界が消えるため禁止する。

配置ルール:

```text
domain / usecase の値
  packages/core/src/domain/<domain>/
  packages/core/src/usecase/<usecase>/

Web / Desktop UI の表示値
  packages/web-renderer/src/components/<component>/
  packages/web-renderer/src/features/<feature>/

React Native UI の表示値
  packages/mobile-renderer/src/components/<component>/
  packages/mobile-renderer/src/features/<feature>/
  packages/mobile-renderer/src/screens/<screen>/

platform adapter の設定値
  packages/platform/src/<capability>/

Web 起動口だけの設定値
  apps/web/src/

Tauri shell だけの設定値
  apps/desktop/src-tauri/src/

Mobile app 起動口だけの設定値
  apps/mobile/src/

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
OK: packages/core/src/domain/card/geometry.ts

NG: constants/web/app/sidebar.ts
OK: packages/web-renderer/src/features/sidebar/sidebarLayout.ts

NG: constants/web/storage/storageKeys.ts
OK: packages/platform/src/storage/storageKeys.ts

NG: constants/shared/app/featureFlags.ts
OK: packages/platform/src/feature-flags/featureFlags.ts
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
  apps/mobile/ios/Manifolia/NativeViews/
  apps/mobile/ios/Manifolia/NativeModules/

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

PencilKit / `PKCanvasView` などの Swift 実装は `apps/mobile/ios/Manifolia/NativeViews/` に置く。

PencilKit のデータ export、InkStroke への変換、session bridge など native module 的な処理は `apps/mobile/ios/Manifolia/NativeModules/` に置く。

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
constants フォルダは作らず、責務を持つ module に値を置く。
全 platform 共通にしたいものは TypeScript code ではなく、schema / token / asset に寄せる。
```