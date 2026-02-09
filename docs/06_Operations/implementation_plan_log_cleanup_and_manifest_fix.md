# ログのクリーンアップとマニフェスト修正計画

アプリケーション起動時に発生している軽微なエラーログと、診断用ログの整理を行います。

## 変更内容の説明

1.  **manifest.json のエラー修正**: 
    -   現状、`index.html` に手動で `manifest.json` へのリンクが記述されていますが、`vite-plugin-pwa` が自動的に `manifest.webmanifest` を生成・注入しているため、二重定義および存在しないファイルへの参照が発生しています。
    -   手動のリンクを削除し、プラグインによる自動インジェクションに一元化します。
2.  **LocalDB 診断ログの改善**:
    -   `LocalDB` のコンストラクタで出力されているスタックトレースが、ブラウザコンソール上でエラーのように見えてしまい、ユーザーを混乱させる可能性があるため、より明確な診断メッセージに変更します。

## 修正対象ファイル

### [Core: Infrastructure]

#### [MODIFY] [index.html](file:///c:/FlashcardMaster/index.html)
- `line 23`: `<link rel="manifest" href="/manifest.json" />` を削除します。

#### [MODIFY] [localDB.ts](file:///c:/FlashcardMaster/src/services/localDB.ts)
- `line 893`: `console.log(new Error('[LocalDB] constructor stack').stack);` を、エラーオブジェクトを直接露出させない形式に変更します。

## 検証計画

### 自動テスト
- なし（ログ表示および静的リンクの修正のため）

### 手動確認
1. アプリケーションをビルド (`npm run build`)。
2. `dist/index.html` を確認し、`<link rel="manifest" ...>` が 1 つだけ（`manifest.webmanifest` への参照のみ）になっていることを確認。
3. 開発サーバーまたはビルド後のプレビューで、ブラウザコンソールに `manifest.json` のロードエラーが出ていないことを確認。
4. `LocalDB` の初期化ログが「Error:」と表示されず、診断情報として出力されていることを確認。
