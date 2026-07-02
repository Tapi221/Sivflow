前提:

```text
Web: React
Desktop: Tauri + React renderer
Android: React Native / Expo
iOS: Swift / SwiftUI
```

この構成では、**iOS は Swift 専用 app として作ります**。React Native / Expo 側は Android app として扱います。

`apps/android` は過去の mobile という名前が残っている既存 path ですが、責務としては Android app です。新規の iOS 実装は `apps/ios` に置き、`apps/android/ios` を iOS 本体の置き場として使いません。

```text
apps/web
  Web の起動口。
  Vite、index.html、public、PWA、Web deploy 設定。

apps/desktop
  Tauri shell。
  Rust command、window 操作、file dialog、OAuth loopback、bundle 設定。
  UI は持たない。Web renderer を WebView で表示するだけ。

apps/android
  Android app。
  既存 Expo / React Native app の path。
  iOS 実装はここに増やさない。
  android/ に必要な Kotlin native module を置く。

apps/ios
  iOS app。
  Swift / SwiftUI を起動口と UI 本体にする。
  iOS native capability、Calendar、Files、PDF、PencilKit などをここに置く。

scripts
  repo 全体の運用スクリプト置き場。
  dev、verify、deploy 補助処理をここに置く。

packages/web-renderer
  Web と Tauri が共有する React UI 本体。
  DOM 前提の component はここ。

packages/android-renderer
  Android の React Native UI 本体。
  View/Text/Pressable/navigation など RN 前提の UI はここ。
  iOS Swift app の UI 本体はここに置かない。

packages/core
  全 platform で共有する純粋ロジック。
  domain model、usecase、validation、日付計算、card/deck ロジックなど。
  React、DOM、Tauri、Expo、SwiftUI に依存しない。

packages/platform
  各 platform adapter の interface と実装。
  Web/Tauri/Android/iOS の違いをここで吸収する。

shared/assets
  全プラットフォーム共通の元 asset。
  app-icon.svg など。

shared/schemas
  TypeScript / Swift / Kotlin に型生成できる言語非依存 schema。

shared/design-tokens
  Web CSS / Android RN StyleSheet / Swift Color に変換する元。
```

## Cloud Run と scripts の責務分離

Firebase Cloud Functions は使わない。`functions/` を Firebase Functions resource directory として作らない。

本体 backend は `packages/backend/server` の `@affine/server` を `Dockerfile.cloudrun` でコンテナ化し、Cloud Run の `sivflow-api` として動かす。Firebase Hosting は `/api/**`、`/graphql`、`/oauth/**`、`/socket.io/**` を Cloud Run に rewrite するだけにする。

repo 全体の運用スクリプトは root の `scripts/` 配下に置く。Cloud Run deploy、検証、整形などの補助処理も root scripts に置く。

```text
Cloud Run backend
  packages/backend/server
  Dockerfile.cloudrun
  cloudbuild.yaml

Firebase Hosting 設定
  firebase.json

repo 全体の運用スクリプト
  scripts/

source 規約や検証 script
  scripts/verify/

開発用 watch script
  scripts/dev/
```

Firebase Functions 用の `functions/package.json`、`functions.yaml`、`scripts/predeploy/firebase-predeploy.cjs`、`nouse/functions` は作らない。古い Functions 実装を残す場合は、別サービスへ移行する設計を決めてから、責務を持つ正式な package として置く。

## platform app の呼び分け

`mobile` は iOS と Android をまとめる呼称として使わない。

```text
Android app
  apps/android
  npm run dev:android
  npm run android
  npm run android:dev
  npm run android:typecheck

iOS app
  apps/ios
  Swift / SwiftUI
```

root script では、Android は `android:*`、iOS は `ios:*` に分ける。`mobile:ios`、`mobile:android` のような横断名は使わない。

`apps/android` の物理 path は既存互換として残っているが、責務名は Android app とする。新規 code、doc、issue、commit message では原則として Android app と呼ぶ。例外として、既存 path、alias、package 名に含まれる `mobile` は段階的に解消する。

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

複数ファイルで使う Android RN UI の表示値
  packages/android-renderer/src/components/<component>/<component>.constants.ts
  packages/android-renderer/src/features/<feature>/<feature>.constants.ts
  packages/android-renderer/src/screens/<screen>/<screen>.constants.ts

複数ファイルで使う platform adapter の設定値
  packages/platform/src/<capability>/<capability>.constants.ts

Web 起動口だけの設定値
  apps/web/src/<責務名>.constants.ts

Tauri shell だけの設定値
  apps/desktop/src-tauri/src/<責務名>.constants.ts

Android app 起動口だけの設定値
  apps/android/src/<責務名>.constants.ts

iOS app 起動口だけの設定値
  apps/ios/<責務名>.swift

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

iPad 手書きモードは Android RN app に直接全部置かない。入力体験、保存形式、表示、同期、native 実装を分けて配置する。スマホには手書きモードのナビも画面も出さない。

```text
共通Inkモデル
  packages/core/src/domain/card/ink/

Web/Desktop表示
  packages/web-renderer/src/components/ink/
  packages/web-renderer/src/features/card/ink/

iPad専用Swift UI
  apps/ios/Sivflow/Features/Handwriting/
  apps/ios/Sivflow/Components/Ink/

iOS native PencilKit
  apps/ios/Sivflow/NativeViews/
  apps/ios/Sivflow/NativeModules/

Desktop/Tauri通信
  apps/desktop/src-tauri/src/

Platform差分吸収
  packages/platform/src/handwriting/

言語非依存schema
  shared/schemas/
```

### 共通Inkモデル

`InkDocument`、`InkStroke`、`InkPoint`、`InkSide`、`InkTool`、正規化、clone、validation は `packages/core/src/domain/card/ink/` に置く。

ここは React、DOM、Tauri、Expo、SwiftUI、PencilKit に依存しない。iPad と Desktop の見た目を揃えるため、保存形式は既存の Ink document 形式に統一する。

### Web/Desktop表示

HTML Canvas、Pointer Events、カード上 overlay、Web/Desktop用 toolbar は `packages/web-renderer` に置く。

Tauri Desktop は UI を持たないため、Desktop 上の Ink 表示・編集 UI は `apps/desktop` ではなく Web renderer に置く。

### iPad専用Swift UI

SwiftUI の iPad 専用画面、接続中の Desktop session 表示、iPad 手書きモード画面、iPad用 toolbar は `apps/ios/Sivflow/Features/Handwriting/` と `apps/ios/Sivflow/Components/Ink/` に置く。

スマホには手書きモードのナビも画面も出さない。iPad 手書き機能を iPhone / Android の共通機能として扱わない。

### iOS native PencilKit

PencilKit / `PKCanvasView` などの Swift 実装は `apps/ios/Sivflow/NativeViews/` に置く。

PencilKit のデータ export、InkStroke への変換、session bridge など native module 的な処理は `apps/ios/Sivflow/NativeModules/` に置く。

React Native アプリの一部として扱わない。iOS Swift app の native capability として扱う。

### Desktop/Tauri通信

LAN WebSocket server、session start/stop、Windows ファイアウォールに関係する native command は `apps/desktop/src-tauri/src/` に置く。

ただし、Desktop のボタンや表示 UI はここに置かない。Tauri は shell と native capability に限定する。

### Platform差分吸収

手書き session の interface、Desktop/Android/Web/iOS adapter、通信方式の差分は `packages/platform/src/handwriting/` に置く。

接続発見を cloud にするか LAN にするか、Desktop が server になるか、iPad が client になるか、といった差分は renderer から直接扱わない。

### schema

Swift / Kotlin / TypeScript 間で型生成したい Ink document や handwriting session は `shared/schemas/` に置く。

一番大事な教訓はこれです。

```text
Web と Tauri は renderer を共有する。
Android は React Native renderer にする。
iOS は Swift / SwiftUI app にする。
Firebase Functions は使わず、Cloud Run は Dockerfile.cloudrun で本体 backend を動かす。
repo 全体の運用スクリプトは root scripts に置く。
constants フォルダは作らず、責務を持つ module に値を置く。
そのファイルでしか使わない定数は、そのファイル内に定義する。
複数ファイルで使う定数だけ、責務 module 内の .constants.ts に置いてよい。
全 platform 共通にしたいものは TypeScript code ではなく、schema / token / asset に寄せる。
```
