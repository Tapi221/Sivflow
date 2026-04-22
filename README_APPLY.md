# FlashCard-Master sidebar Logseq refresh

この zip は `main` にそのまま上書き適用できる **差し替えファイル一式** です。
フルリポジトリではなく、サイドバー改善に必要な変更ファイルだけを入れています。人類は毎回全部のソースをzipに詰めたがるけど、差分だけの方がまともです。

## 変更ファイル
- `src/layout/Sidebar.tsx`
- `src/layout/Sidebar.css`
- `src/layout/AppLayout.css`
- `src/layout/sidebarNavItem.utils.ts`

## 変更内容
- ベージュ基調をやめて、Logseq寄りのニュートラルグレーへ変更
- サイドバー上部にワークスペース風ヘッダーを追加
- ナビ項目を `メイン` / `整理` の2セクションに分割
- 行高、角丸、余白、hover/active 状態を見直して密度を改善
- `ds-nav-action` クラスを付与して、既存の共通ナビ表現と整合
- アプリレイアウト側のサイドバー幅を `264px` に統一

## 適用方法
1. zip を解凍
2. リポジトリルートで同じパスに上書き
3. `npm run dev` または普段の起動コマンドで確認

## メモ
- 今回は安全側で、既存機能を増やさず見た目と構造だけ寄せています
- 追加したヘッダーは `/folders` へのリンクです
- フルリポジトリzipが必要なら、GitHub側でチェックアウトしてからこの差分を適用してください
