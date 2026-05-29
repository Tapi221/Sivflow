# Mobile Native 開発開始メモ

## 結論

Manifolia の native mobile は、既存の Vite / React / Electron 画面をそのまま React Native に流用するのではなく、`apps/mobile` に Expo / React Native アプリを追加し、ドメインロジック・型・ユースケースを段階的に共有していく。

理由は、現行アプリが DOM / CSS / Electron / web storage 前提のコンポーネントを多く持つため。最初から画面コンポーネントを共通化しようとすると、React Native 側で `<div>` / CSS / browser API / Electron API の差分に詰まりやすい。

## 現在の前提

- root は Vite + React の Web アプリ。
- Electron も同じ Web renderer を利用している。
- `PresentationTarget` で `desktop` / `mobile` の表示ターゲット判定はすでに存在する。
- ただし、これは Web 表示上の mobile 対応であり、iOS / Android の native app ではない。

## 最初に作る構成

```txt
FlashCard-Master/
  apps/
    mobile/              # Expo / React Native app
  src/                   # 既存 Web / Electron app は当面そのまま
  docs/
    mobile-native-start.md
```

最初から既存 root を `apps/web` に移動しない。移動は import path / CI / Electron build / Vite 設定に影響が大きいので、Native MVP が動いてから行う。

## セットアップ手順

```bash
mkdir -p apps
npx create-expo-app@latest apps/mobile
cd apps/mobile
npx expo start
```

まずは Expo Go で実機確認できる状態を作る。native module が必要になった時点で development build / EAS Build に進む。

## 開発順

1. `apps/mobile` に Expo アプリを作る。
2. Expo Router で最低限のタブを作る。
   - Library
   - Study
   - Schedule
   - Settings
3. 既存の Web コンポーネントは移植しない。
4. 共有するのは先に以下だけ。
   - card / folder / schedule の型
   - import / export / study の純粋関数
   - Firebase / auth / storage の interface
5. native 側では画面を React Native の `<View>` / `<Text>` / `Pressable` / `FlatList` で作り直す。
6. 動いた画面から、共通化できるロジックを `packages/core` へ逃がす。

## 最初の MVP 画面

native mobile で最初に作るのはこの順番。

1. Login
2. Library folder list
3. Card set list
4. Study mode
5. Settings

Card editor / PDF / BlockNote / drag-and-drop / Electron 専用操作は後回し。特に PDF と BlockNote は native 側で別実装になる可能性が高い。

## 共通化のルール

### 共有してよいもの

- TypeScript の型
- バリデーション
- ID 生成
- スケジュール計算
- フラッシュカードの出題ロジック
- Firebase とのデータ変換
- import / export の純粋関数

### すぐ共有しないもの

- React DOM コンポーネント
- CSS / Tailwind class
- Electron API
- browser storage 直接参照
- `window` / `document` 参照
- drag-and-drop UI
- rich text editor UI

## 目安のディレクトリ

Native MVP が動き始めたら、次にこう分ける。

```txt
packages/
  core/
    src/
      cards/
      folders/
      schedule/
      study/
      sync/
  config/
    src/
      firebase/
      feature-flags/
```

Web 側は `@/` import を保ったまま、native と共有したいものだけ `@manifolia/core` のような workspace package に移す。

## 判断基準

- 「Web の mobile responsive」なら既存 `PresentationTarget` と CSS を伸ばす。
- 「iOS / Android アプリ」なら `apps/mobile` の Expo / React Native で別 shell を作る。

今回の `native` 方針は後者。
