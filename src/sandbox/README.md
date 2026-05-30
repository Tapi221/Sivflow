# Sandbox routes

開発用の sandbox ページ一覧です。パスを忘れたときはこのファイルを見る。

## Routes

| Route | Source | 用途 |
| --- | --- | --- |
| `/sandbox/blocknote` | `src/sandbox/blocknote` | BlockNote の表示・操作確認 |
| `/sandbox/logseq` | `src/sandbox/logseq` | Logseq の設計参考メモ |

## Notes

- sandbox route は開発モード用です。
- route 定義は `packages/web-renderer/src/app/routing/DevRoutes.tsx` にあります。
- 通常 route から schedule にリダイレクトされる場合は、`packages/web-renderer/src/app/routing/AppRoutes.tsx` の `REDIRECT_TO_SCHEDULE_ROUTES` を確認する。
