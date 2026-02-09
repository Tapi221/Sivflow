# functions_flow — トリガーフロー（Mermaid）

最終更新: 2026-02-05

このファイルは `functions/` にある Cloud Functions の主要トリガーについて、簡易的なフロー図と処理説明を示します。

---

## セキュリティログ作成フロー

ファイル: [functions/src/security/index.ts](functions/src/security/index.ts#L1)

```mermaid
flowchart TD
  A[Client writes security log] -->|create| B[Firestore: users/{userId}/securityLogs/{logId}]
  B --> C[Cloud Function: onSecurityLogCreated]
  C --> D[detectAbnormalPatterns]
  C --> E[calculateRiskScore]
  E --> F{riskScore >= thresholds}
  F -->|>=21| G[Add notification to users/{userId}/notifications]
  F -->|>=51| H[Set user.requires2FA = true]
  F -->|>=81| I[Revoke devices & lock account]
  D --> J[Log for audit]
  I --> K[Batch update devices + user doc]
```

説明:
- クライアントが `users/{userId}/securityLogs/` にログを作成するとトリガーが作動します。
- `detectAbnormalPatterns` と `calculateRiskScore` で評価し、リスクスコアに応じて通知、2FA 要求、全端末の revoke、アカウントロックなどの自動対処を実行します。

運用上の注意:
- 閾値やルールは `functions/src/security/index.ts` 内の `DETECTION_RULES` で管理されています。ルール変更は段階的にステージングで検証してください。
