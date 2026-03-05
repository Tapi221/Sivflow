# Flashcard Master

**「記憶の定着」を科学する、エンジニアのための学習アプリ。**

## 📚 ドキュメント体系 (Documentation)

本プロジェクトは「設計思想（Why）」と「仕様（What）」を明確に分離して管理しています。
開発に参加する際は、まず以下のドキュメントに目を通してください。

### 0. 必読：設計思想 (Philosophy)

- [ディレクトリ構成と責務](docs/00_Overview/ディレクトリ構成と責務.md) - コンポーネント設計の地図。
- [データアクセス・状態管理方針](docs/00_Overview/データアクセス・状態管理方針.md) - なぜ "Local First" なのか。
- [モバイルUXガイドライン](docs/00_Overview/モバイルUXガイドライン.md) - スマホ特化のUIルール。
- [プロダクトの人格とマイクロコピー](docs/00_Overview/プロダクトの人格とマイクロコピー.md) - アプリのTone & Voice。
- [やらないことリスト](docs/00_Overview/やらないことリスト.md) - スコープの境界線。

### 1. 運用・開発ルール (Operations)

- [開発とリリースの運用ポリシー](docs/00_Overview/開発とリリースの運用ポリシー.md) - Definition of Done。
- [トラブルシューティングとデータ復旧](docs/06_Operations/トラブルシューティングとデータ復旧.md) - 緊急時のマニュアル。
- [用語集](docs/00_Overview/用語集.md) - 共通言語の定義。

### 2. 詳細仕様書 (Specifications)

`docs/02_Features/` 配下に機能ごとの詳細仕様があります。

- [復習アルゴリズム仕様書](docs/03_Logic/復習アルゴリズム仕様書.md)
- [同期システム仕様書](docs/03_Logic/同期システム仕様書.md)

---

## 🛠 技術スタック (Tech Stack)

- **Core**: React 19, TypeScript 5.x, Vite 6.x
- **Database**:
  - **Local**: Dexie.js (IndexedDB wrapper) - **Source of Truth**
  - **Cloud**: Firebase Firestore - Sync & Backup
- **Styling**: TailwindCSS, Radix UI, Framer Motion
- **Features**:
  - **Editor**: Prism React Renderer (Code), KaTeX (Math)
  - **Charts**: Recharts
  - **Image**: heic2any (Client-side conversion)

## 🚀 セットアップ

### Prerequisite

- Node.js v20+
- Fireabse Project (for Auth/Firestore)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Setup Environment Variables
cp .env.example .env.local
# (Fill in your Firebase config keys)

# 3. Start Dev Server
npm run dev
```

## 🏗 プロジェクト構造概要

```

## UI統一ルール（カード）
* `CardFrame` 以外で `rounded-*` / `shadow-*` / `ring-*` / `max-w-*` をカード見た目目的で追加しない。
* ブロック枠の見た目は `BlockWrapper` / `BlockRenderer` に集約し、他画面で個別実装しない。
.
├── src/                        # Web app source (React + TS)
│   ├── Components/             # Feature-based components
│   │   ├── card/               # Card domain (Editor, Block, etc.)
│   │   │   └── blocks/         # Block implementations (e.g. MathBlock.tsx)
│   │   ├── ui/
│   │   └── ...
│   ├── hooks/
│   ├── __tests__/
│   ├── assets/
│   ├── App.tsx
│   └── main.tsx
├── functions/                  # Firebase Functions (node/ts)
│   ├── src/
│   └── lib/
├── public/                     # Static/public files
│   └── manifest.webmanifest
├── docs/                       # ドキュメント（仕様・設計・運用）
├── scripts/                    # 各種スクリプト・マイグレーション
├── services/                   # 外部サービス / マイクロサービス
├── tests/                      # e2e / integration テスト
├── test-results/               # テスト結果出力
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```
