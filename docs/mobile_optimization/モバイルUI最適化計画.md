# モバイルUI最適化計画

スマホ画面でのUI崩れを修正し、PC版と同様の快適な操作性を実現します。

## ユーザーレビューが必要な項目

- ブロック操作アイコン（移動、複製、削除）をモバイルでは常に表示するように変更します。
- ブロック追加ツールバーをモバイルでは横スクロール可能にします。

## 修正内容

### CardEditor [CardEditor.tsx]

- ヘッダー部分（Index, タイトル, タグ, トグル）のレイアウトをモバイルでは縦並びに近い構成に調整します。
- 各要素の `min-w` 設定がモバイルで画面幅を超えないように調整します。

#### [MODIFY] [CardEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/CardEditor.tsx)

### BlockEditor [BlockEditor.tsx]

- ブロック追加ツールバー（テキスト、コード、画像など）のコンテナに `overflow-x-auto` を追加し、モバイルで横スクロールできるようにします。
- ボタン同士の間隔やパディングを微調整します。

#### [MODIFY] [BlockEditor.tsx](file:///c:/FlashcardMaster/src/Components/card/BlockEditor.tsx)

### BlockWrapper [BlockWrapper.tsx]

- 操作アイコンの `opacity-0` をモバイルでは解除し、常に表示されるようにします（`md:opacity-0`）。
- アイコンの配置を調整し、コンテンツとの重なりを最小限にします。

#### [MODIFY] [BlockWrapper.tsx](file:///c:/FlashcardMaster/src/Components/card/blocks/BlockWrapper.tsx)

## 検証計画

### 自動テスト
- 現状、UIのレイアウトに関する自動テストは存在しないため、手動検証を主に行います。

### 手動検証
- ブラウザのデベロッパーツール（iPhone SE/12 Pro/Pixel 5 シミュレーション）を使用して以下の点を確認します。
    1. カード編集画面のヘッダーが崩れず、すべての要素が表示・操作可能であること。
    2. ブロック追加ツールバーが横スクロールでき、全ボタンが押せること。
    3. 各ブロックの操作アイコン（複製、削除等）がモバイルで表示され、タップ可能であること。
    4. 画面全体の水平スクロールが発生しないこと。
