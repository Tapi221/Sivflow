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

一番大事な教訓はこれです。

```text
Web と Tauri は renderer を共有する。
React Native は別 renderer にする。
Swift は apps/mobile/ios 配下の native extension として扱う。
全 platform 共通にしたいものは TypeScript code ではなく、schema / token / asset に寄せる。
```
