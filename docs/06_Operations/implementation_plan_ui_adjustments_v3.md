# UI調整計画: コードブロックとリンクブロック

ユーザーの要望に基づき、コードブロックの縦幅を削減し、リンクブロックのURL入力フィードバックを強化します。

## 変更内容

### 1. [CodeBlockEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/CodeBlockEditor.tsx)
- **パディングの削減**:
    - ツールバー: `px-4 py-2` -> `px-3 py-1.5`
    - エディタエリア: `padding={24}` -> `padding={12}`
- **レイアウト調整**:
    - プレースホルダーの配置: `top-6 left-6` -> `top-3 left-3`
    - 最小高さ: `80px` -> `56px`
    - 角丸: `rounded-[24px]` -> `rounded-xl` (よりコンパクトな印象にするため)

### 2. [ReferenceBlock.tsx](file:///c:/FlashcardMaster/src/Components/card/blocks/ReferenceBlock.tsx)
- **URLバリデーションとスタイル適用**:
    - 入力された `url` が有効なURL形式（`http://` または `https://` で始まる）かどうか判定。
    - 有効な場合、入力テキストの色を `text-blue-600` にし、下線 `underline` を付与してリンクらしく見せる。
    - 無効（入力中など）の場合は通常のテキスト色のまま。

## 検証計画
### 手動検証
1. **コードブロック**:
    - 以前よりも縦幅が狭くなっていることを目視確認。
    - 入力とコピー機能が以前通り動作することを確認。
2. **リンクブロック**:
    - `https://google.com` などを入力し、文字色が青くなり下線が付くことを確認。
    - 不正な文字列（`abc`など）では通常表示であることを確認。
