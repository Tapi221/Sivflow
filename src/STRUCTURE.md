# src Structure

## 配置ルール

- `components/`: 汎用UI（機能非依存・再利用前提）
- `features/`: 機能単位のUI＋ロジック（その機能でしか使わないものはここ）
- `pages/`: ルーティングの入口（画面コンポーネント）
- `services/`: 外部境界（API/DB/同期/ストレージ/副作用）
- `stores/`: グローバル状態（Zustand等）。共有状態は基本ここに寄せる
- `contexts/`: React Contextは必要最小限（DI/Session等）。状態管理の本体は`stores/`優先
- `entities/`: ドメインの中核モデル（例: `Card`, `Tag`）とその不変条件・小さな振る舞い
- `domain/`: ユースケース/ドメインサービス（例: `createCard`, `moveBlock` など）
- `types/`: 外部境界のDTO/型（APIレスポンス等）や広域で使う“型だけ”
- `utils/`: ドメインに無関係な汎用（string/date/array等）。ドメイン固有ロジックは禁止
- `lib/`: 共通基盤（薄いラッパ、初期化、共有インフラ）
- `styles/theme/`: 見た目（読み込み順を変えない）

## 運用メモ

- `components/` に feature 専用のまとまりを置かない
- `features/<name>/` では、その機能の UI と補助ロジックを近接配置する
- `pages/` から機能実装に入る場合は、原則 `features/` を参照する
- `contexts/` に状態本体を持ち込みすぎない。共有状態の本体は `stores/` を優先する
- `types/` は型宣言のみを置く。実行ロジックを含む場合は `utils/` か feature 配下へ置く
- `entities/` と `domain/` は責務を分ける。モデルそのものは `entities/`、複数モデルをまたぐ処理は `domain/`

## 今回の移動

- `components/study/` -> `features/study/`
- `components/review/` -> `features/review/`

## 移動対象一覧

現時点では差分を抑えるため未移動。次段階の候補として扱う。

- `src/components/folder/`
- `src/components/explorer/`
- `src/components/settings/`
- `src/components/sync/`
- `src/components/security/`
- `src/components/notifications/`
- `src/components/export/`
- `src/components/pdf/`
- `src/components/pptx/`
- `src/components/tag/`
- `src/types/index.ts` 内のドメイン中核モデル定義（`entities/` との責務境界が曖昧）
- `src/types/Folder.ts`（`src/types/index.ts` と重複）
- `src/utils/index.ts`（ドメイン寄りの正規化ロジックを含む）
- `src/contexts/AuthContext.tsx`（Context が状態本体を多く持つため、将来的な `stores/` との再分離候補）
