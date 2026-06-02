# Architecture Test Cases

## tests/unit/architecture/directoryLayoutPolicy.test.ts

- [ ] Web entrypoint は `apps/web` に限定し、Vite、`index.html`、`public`、PWA、Web deploy 設定だけを置く
- [ ] Web と Tauri が共有する React UI 本体は `packages/web-renderer` に置く
- [ ] Desktop は `apps/desktop/src-tauri` の Tauri shell に限定し、Rust command、window 操作、file dialog、OAuth loopback、bundle 設定だけを置く
- [ ] Desktop UI を `apps/desktop` に置かず、Web renderer を WebView で表示するだけにする
- [ ] React Native app の起動口は `apps/mobile` に置き、画面本体は renderer package へ寄せる
- [ ] Swift native module は `apps/mobile/ios/Manifolia/NativeModules` に置く
- [ ] Swift native view は `apps/mobile/ios/Manifolia/NativeViews` に置く
- [ ] Swift 専用 app root を作らず React Native app の native extension として扱う
- [ ] Android native module が必要な場合だけ `apps/mobile/android` に置く
- [ ] DOM 前提の component は `packages/web-renderer` に置く
- [ ] React Native 前提の UI は `packages/mobile-renderer` に置く
- [ ] `packages/core` は React、DOM、Tauri、Expo、Swift、PencilKit に依存しない純粋ロジックだけにする
- [ ] platform adapter の interface と実装は `packages/platform` に置く
- [ ] Web / Tauri / RN の差分を renderer から直接扱わず `packages/platform` に吸収する
- [ ] 全 platform 共通の元 asset は `shared/assets` に置く
- [ ] TypeScript / Swift / Kotlin に型生成したい言語非依存 schema は `shared/schemas` に置く
- [ ] Web CSS / RN StyleSheet / Swift Color に変換する design token は `shared/design-tokens` に置く
- [ ] `shared` 配下は assets / schemas / design-tokens の責務別 root に限定する

## tests/unit/architecture/responsibilityBoundaries.test.ts

- [ ] `constants/`、`src/constants/`、`packages/*/constants/` のような定数専用フォルダを拒否する
- [ ] 定数の置き場所を「定数であること」ではなく「誰の責務か」で決める
- [ ] そのファイルでしか使わない値は、そのファイル内に保持する
- [ ] 単一ファイル専用の値を shared、utils、config、constants、`.constants.ts` に逃がさない
- [ ] ファイル内の import / 型定義 / 定数 / helper 関数 / component 本体 / memo-displayName-export の順序を検証する
- [ ] 複数ファイルで使う値だけ `<責務名>.constants.ts` へ昇格できる
- [ ] `.constants.ts` は専用 constants フォルダではなく、利用責務の module と同じ階層に置く
- [ ] `.constants.ts` は複数ファイルから import される値だけを許可する
- [ ] 1ファイルからしか import されない `.constants.ts` を拒否する
- [ ] `.constants.ts` の昇格先を platform 種別ではなく責務で決める
- [ ] domain / usecase 共通値は `packages/core/src/domain/<domain>/<domain>.constants.ts` または `packages/core/src/usecase/<usecase>/<usecase>.constants.ts` に置く
- [ ] Web / Desktop UI 表示値は `packages/web-renderer/src/components/<component>/<component>.constants.ts` または `packages/web-renderer/src/features/<feature>/<feature>.constants.ts` に置く
- [ ] React Native UI 表示値は `packages/mobile-renderer/src/components/<component>/<component>.constants.ts`、`features`、`screens` の責務 module に置く
- [ ] platform adapter 設定値は `packages/platform/src/<capability>/<capability>.constants.ts` に置く
- [ ] Web 起動口だけの設定値は `apps/web/src/<責務名>.constants.ts` に置く
- [ ] Tauri shell だけの設定値は `apps/desktop/src-tauri/src/<責務名>.constants.ts` に置く
- [ ] Mobile app 起動口だけの設定値は `apps/mobile/src/<責務名>.constants.ts` に置く
- [ ] Swift / Kotlin / TypeScript で共有したい構造は `shared/schemas` に置く
- [ ] 色、余白、typography は `shared/design-tokens` に置く
- [ ] 画像、icon、音声などの asset 元は `shared/assets` に置く
- [ ] `@constants` のような横断 barrel export を拒否する
- [ ] 共通化する場合は責務を持つ module から公開する
- [ ] 同一階層の参照は相対パスを使う
- [ ] 階層をまたぐ参照は `@/` エイリアスを使う
- [ ] import パスがズレている場合に互換パスを追加せず、正しい import パスへ修正する
- [ ] import 文は複数行に展開せず、各 import 文を1行にまとめる
- [ ] 依存関係がある場合は、依存されるものを先に記述する

## tests/unit/architecture/ipadHandwritingResponsibility.test.ts

- [ ] iPad 手書きモードを `apps/mobile` に直接全部置かない
- [ ] 入力体験、保存形式、表示、同期、native bridge を分けて配置する
- [ ] スマホには手書きモードのナビを出さない
- [ ] スマホには手書きモード画面を出さない
- [ ] 共通 Ink model は `packages/core/src/domain/card/ink` に置く
- [ ] `InkDocument`、`InkStroke`、`InkPoint`、`InkSide`、`InkTool` は core の Ink domain に置く
- [ ] Ink の正規化、clone、validation は core の Ink domain に置く
- [ ] core の Ink document model は React、DOM、Tauri、Expo、Swift、PencilKit に依存しない
- [ ] iPad と Desktop の保存形式を既存の Ink document 形式に統一する
- [ ] HTML Canvas、Pointer Events、カード上 overlay は `packages/web-renderer` に置く
- [ ] Web/Desktop 用 Ink toolbar は `packages/web-renderer` に置く
- [ ] Desktop 上の Ink 表示・編集 UI は `apps/desktop` ではなく Web renderer に置く
- [ ] React Native の iPad 専用画面は `packages/mobile-renderer/src/screens/ipad/handwriting` に置く
- [ ] 接続中の Desktop session 表示は iPad 専用 screen に置く
- [ ] iPad 用 toolbar は `packages/mobile-renderer/src/components/ipad/ink` に置く
- [ ] `apps/mobile/src/App.tsx` は起動口と navigation 接続に留める
- [ ] iPad 手書き画面の本体は renderer package 側に寄せる
- [ ] `packages/mobile-renderer` で手書き機能をスマホ共通機能として扱わない
- [ ] PencilKit / `PKCanvasView` の Swift 実装は `apps/mobile/ios/Manifolia/NativeViews` に置く
- [ ] PencilKit のデータ export、InkStroke 変換、session bridge は `apps/mobile/ios/Manifolia/NativeModules` に置く
- [ ] LAN WebSocket server、session start/stop、Windows firewall 関連 native command は `apps/desktop/src-tauri/src` に置く
- [ ] Desktop のボタンや表示 UI を `apps/desktop/src-tauri/src` に置かない
- [ ] Tauri は shell と native capability に限定する
- [ ] 手書き session の interface、Desktop/Mobile/Web adapter、通信方式の差分は `packages/platform/src/handwriting` に置く
- [ ] 接続発見方式や Desktop server / Mobile client の差分を renderer から直接扱わない
- [ ] Ink document と handwriting session の共有構造は `shared/schemas` に置く
- [ ] 全 platform 共通にしたいものは TypeScript code ではなく schema / token / asset に寄せる
