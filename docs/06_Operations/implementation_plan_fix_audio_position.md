 # 実装計画：音声ブロックの固定配置と並び替え無効化

## 概要
ユーザーの要望により、音声ブロック（`audio`）の配置を「リンクブロック（`reference`）の上」に固定します。リンクブロックが存在しない場合は、ブロックリストの最後尾（追加可能な他の可変ブロックの下）に固定します。
また、音声ブロックは固定配置となるため、並び替えハンドル（ドラッグ移動機能）を無効化し、表示しないようにします。

## 変更対象ファイル

### 1. `src/Components/card/BlockEditor.tsx`
- **`handleAddBlock` の修正**:
    - 新しいブロックを追加する際、`audio` ブロックや `reference` ブロックよりも手前に挿入するようにロジックを変更します。
    - 音声ブロックを追加する場合は、リンクブロックの手前に挿入します。
- **レンダリングロジック (`Draggable`) の修正**:
    - 音声ブロックの `Draggable` プロパティ `isDragDisabled` を `true` に設定します。
- **`MediaBlock` へのプロパティ変更**:
    - 音声ブロックの場合、`dragHandleProps` に `undefined` を渡し、グリップアイコンを非表示にします。

### 2. `src/Components/card/CardEditor.tsx`
- **`onDragEnd` (`finalizeBlocks`) の修正**:
    - ドラッグ＆ドロップ終了時に呼ばれる正規化ロジック (`finalizeBlocks`) を更新します。
    - 配列を再構築する際、必ず `[...他のブロック, 音声ブロック(あれば), リンクブロック(あれば)]` の順序になるよう強制します。

## 具体的な変更内容

### BlockEditor.tsx
- `handleAddBlock`: 挿入位置の計算ロジックを修正。
    - 優先順位: 通常ブロック < 音声ブロック < リンクブロック
- `Draggable`: `isDragDisabled={block.type === 'reference' || block.type === 'audio'}`
- `MediaBlock`: `dragHandleProps={block.type === 'audio' ? undefined : provided.dragHandleProps}`

### CardEditor.tsx
- `finalizeBlocks`:
    ```typescript
    const finalizeBlocks = (list: any[]) => {
      const reference = list.find(b => b.type === 'reference');
      const audio = list.find(b => b.type === 'audio');
      // 音声とリンクを除外したリスト
      const others = list.filter(b => b.type !== 'reference' && b.type !== 'audio');
      
      const result = [...others];
      if (audio) result.push(audio);
      if (reference) result.push(reference);
      
      return result;
    };
    ```

## 検証計画
以下の手順で動作確認を行います。

1. **初期配置の確認**
    - 新規カード作成画面を開く。
    - 「音声」ボタンを押し、音声ブロックが追加されることを確認。
    - 「リンク」ボタンを押し、リンクブロックが**音声ブロックの下**に追加されることを確認。
    - 「テキスト」ボタンを押し、テキストブロックが**音声ブロックの上**に追加されることを確認。

2. **並び替え制限の確認**
    - 音声ブロックにマウスカーソルを合わせ、左側のドラッグハンドル（グリップ用アイコン）が表示されないことを確認。
    - テキストブロックをドラッグし、音声ブロックの下（またはリンクブロックの間）に移動させようとする。
    - ドロップ後、自動的に音声ブロックの上にテキストブロックが戻る（あるいは音声ブロックが下に押し出される）ことを確認。

3. **既存データの挙動確認**
    - 既存のカード（音声やリンクが含まれるもの）を編集モードで開く。
    - 保存時に順序が強制的に修正されるか（またはドラッグ操作時に修正されるか）を確認。
    - *注: 保存時の強制は今回のスコープ外だが、一度ドラッグ操作を行えば修正されるロジックとなっている。*

4. **削除・再追加**
    - 音声ブロックを削除し、再度追加した際に正しい位置（リンクの上）に入るか確認。
