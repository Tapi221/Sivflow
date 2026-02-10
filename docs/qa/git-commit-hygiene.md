# Git Commit Hygiene

コミット混入事故を防ぐための最小ルール。

1. コミット直前に必ず `git diff --cached --name-status` を確認する。
2. 目的ファイルだけをコミットする場合は `git commit -m "..." -- <paths...>` を使う。
3. すでに staged がある状態で作業を始める場合は、先に `git restore --staged .` で index を空にしてから必要分だけ `git add` し直す。
4. パスの大文字小文字を混在させない（例: `src/Components` を正とし、`src/components` を作らない）。
