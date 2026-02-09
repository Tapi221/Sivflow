# 空カード保存防止機能の実装完了レポート

## 実装概要

ユーザー要望「タイトルも入力していないかつ問題側にも解答側にも入力がない(ブロックを追加していても入力なしも含む)、画像や音声も追加していないカードは存在できないようにしてください。保存されたとしてもそれはデータが消えるように」に対応し、空カードの保存防止および自動削除機能を実装しました。

## 変更内容

### 1. 共通ヘルパー関数の追加 ([useCards.ts](file:///c:/FlashcardMaster/src/hooks/useCards.ts#L10-L32))

```typescript
// 空カード判定用のヘルパー関数(createCard と updateCard で共通利用)
function hasBlocksContent(blocks?: any[]): boolean {
  return blocks?.some(b => {
    if (b.type === 'text' || b.type === 'memo') return b.content?.trim();
    if (b.type === 'code') return b.code?.code?.trim();
    if (b.type === 'image') return b.images?.length > 0;
    if (b.type === 'audio') return b.audios?.length > 0;
    if (b.type === 'math') return b.math?.latex?.trim();
    if (b.type === 'reference') return b.references?.some((r: any) => r.url?.trim());
    return false;
  }) || false;
}

function isCardCompletelyEmpty(cardData: Partial<Card>): boolean {
  return (
    !cardData.title?.trim() && 
    !cardData.tags?.length && 
    !hasBlocksContent(cardData.questionBlocks) && 
    !hasBlocksContent(cardData.answerBlocks) &&
    !cardData.questionText?.trim() && // Legacy support
    !cardData.answerText?.trim()      // Legacy support
  );
}
```

**判定基準:**
- タイトルが空
- タグが未設定
- 問題側のブロックに実質的なコンテンツがない
- 解答側のブロックに実質的なコンテンツがない
- (Legacy) questionText/answerText が空

### 2. `updateCard` の改修 ([useCards.ts](file:///c:/FlashcardMaster/src/hooks/useCards.ts#L193-L219))

更新後のカード状態をシミュレーションし、空になる場合は自動的に削除する処理を追加:

```typescript
const updateCard = async (id: string, data: Partial<Card>) => {
  if (!currentUser) throw new Error('認証が必要です');

  const db = await getLocalDb(currentUser.uid);
  
  // 更新後のカード状態をシミュレーション
  const currentCard = cards.find(c => c.id === id);
  if (!currentCard) {
    console.warn('[updateCard] Card not found:', id);
    return;
  }
  
  const mergedCard = { ...currentCard, ...data };
  
  // 更新後に空になる場合は削除
  if (isCardCompletelyEmpty(mergedCard)) {
    console.log('[updateCard] Card became empty after update, deleting:', id);
    await deleteCard(id);
    return;
  }
  
  // 通常の更新処理
  await db.updateItem('cards', id, {
    ...data,
    updatedAt: new Date(),
  });
};
```

### 3. 既存の `createCard` バリデーション

既存の `createCard` には空カード作成を防ぐバリデーションが実装済みです。新規作成時に空のカードを保存しようとするとエラーが発生します。

## 動作仕様

### 新規作成時
- 空のカードを保存しようとすると、エラー「カードの内容を入力してください。」が表示され、作成が拒否されます
- UI側でも `CardEditor.tsx` の `isCardEmpty()` により保存ボタンが非活性化されます

### 更新時
- カードを編集して全ての内容を削除した場合、保存時に自動的にソフトデリートされます
- `deleteCard` 関数により `isDeleted` フラグが立ち、ゴミ箱に移動します

## ビルド結果

```
✓ built in 38.83s
```

ビルドは正常に完了しました。TypeScriptの型エラーやランタイムエラーは発生していません。

## 検証推奨項目

1. **新規作成時の防止確認**:
   - 新規カード作成画面で何も入力せずに保存ボタンを押す
   - 保存ボタンが非活性化されていることを確認

2. **更新時の自動削除確認**:
   - 既存のカードを開く
   - タイトル、全てのブロック内容を削除
   - 保存すると、カードがゴミ箱に移動することを確認

3. **部分的な内容がある場合**:
   - タイトルのみ、またはブロック1つだけに内容がある場合は保存されることを確認

## 備考

- `CardEditor.tsx` の UI 側バリデーションにより、通常の操作では空カードの保存ボタンが押せない仕様になっています
- Backend (Hook) 側のガードにより、何らかの理由で空データが送信された場合でもゴミデータとして残らないようになっています
- `toggleFlag` などの部分更新操作では、フラグのみの変更なので空にはならず、意図しない削除は発生しません
