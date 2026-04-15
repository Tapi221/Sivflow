# デザインシステムアーキテクチャ

## 目的

このリポジトリでは、UI の実装は各プラットフォームに閉じたまま維持しつつ、React、SwiftUI、Jetpack Compose で共通利用できるデザイン契約を導入します。

## 共有対象と非共有対象

### 共有対象

- `design/tokens/*.json`: プリミティブトークンとセマンティックエイリアスのソースオブトゥルース
- `design/components/*.md`: 状態名とトークン利用方針を定義するコンポーネント契約
- `design/patterns/*.md`: 各プラットフォームで同一のプロダクト構造を保つためのレイアウトおよび構成ガイド
- 生成物:
  - `src/presentation/react/theme/`
  - `ios/App/DesignSystem/Tokens/`
  - `android/app/src/main/java/com/akari221/flashcardmaster/designsystem/tokens/`

### 非共有対象

- React の JSX、hooks、ルーティング、機能接続
- 将来的な SwiftUI の View ツリーおよび Jetpack Compose の Composable 実装
- `src/layout/TitleBar.tsx` のような Electron 固有 UI
- プラットフォームごとのナビゲーション、ジェスチャー、フォーカス制御、アクセシビリティ API、ウィンドウ管理

## トークンフロー

1. `design/tokens/*.json` を編集する
2. `npm run design-tokens:build` を実行する
3. `tools/design-tokens/build-tokens.ts` がセマンティック参照を解決する
4. ビルド結果として、各プラットフォーム向け出力を生成する
   - React: CSS 変数と型付きトークンエクスポート
   - Swift: トークン定数
   - Compose: トークン定数
5. 各プラットフォームは自身向けの生成結果を利用し、画面コードは共有しない

## 現在の抽出ベースライン

既存挙動を維持するため、初期トークン値は現在の React アプリから抽出しています。

- プライマリカラーの階調と UI スペーシング: `src/styles/tokens/tokens.css`
- サーフェスのエレベーションおよびフローティングサーフェス値: `src/styles/tokens/tokens.css`, `src/styles/base/utilities.css`
- 基本シャドウと角丸: `tailwind.config.js`
- タイポグラフィのフォントファミリ定義: `src/styles/tokens/typography.ts`, `src/styles/components/common.css`

## React 方針

- `src/presentation/react/theme/` は、生成テーマの出力先としてすでに用意されている
- 現在の React UI は当面、既存クラスと CSS 変数を継続利用する
- React の移行は全面書き換えではなく、コンポーネント単位で生成テーマ利用へ段階的に進める

## ネイティブ方針

- `ios/App/DesignSystem/` は、SwiftUI ネイティブなトークン、コンポーネント、パターン導入のための領域とする
- `android/app/src/main/java/com/akari221/flashcardmaster/designsystem/` は、Compose ネイティブなトークン、コンポーネント、パターン導入のための領域とする
- ネイティブ UI は共有トークンを各ネイティブ API にマッピングして利用し、React のマークアップやスタイル表現を直接再利用しない

## 移行計画

1. button や dialog など、低リスクなプリミティブ 1 つに生成 React トークンを適用する
2. 生成値を `Color`、`Font`、spacing helper に変換する SwiftUI 用トークンラッパーを追加する
3. 生成値を `Color`、`TextStyle`、spacing helper に変換する Compose 用トークンラッパーを追加する
4. dialog や list row など、限定的な共有パターンを各プラットフォームで 1 つ移植する
5. 各プラットフォームで契約の妥当性を確認したうえで、コンポーネント適用範囲を拡大する
