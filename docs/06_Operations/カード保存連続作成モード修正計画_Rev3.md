# 連続作成モードにおけるカード保存不具合の修正計画 (Rev.3・精緻化版)

ユーザー様からの詳細な技術フィードバックを反映し、最高度の堅牢性を備えた修正を実施します。

## 根本原因と対策の最終定義

1.  **`orderIndex` の極限的一意性確保 (P0)**
    - **ロジック**: `const orderIndex = cardData.orderIndex ?? (Date.now() * 10000 + Math.floor(Math.random() * 10000));`
2.  **`sessionStorage` ライフサイクルとキー設計 (P0)**
    - **キー**: `qnamode_draft_${editorId}` を使用。
3.  **指数バックオフ付きリトライロジック (P1)**
    - **戦略**: 最大3回試行。バックオフ間隔 1s → 2s → 4s。
4.  **データ読み込みの最適化 (P1)**
    - `useCards(folderId)` によるフィルタリング済みの取得。

詳細はアーティファクトの implementation_plan.md を参照。
