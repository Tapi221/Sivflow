// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getLocalDb, LocalDB } from '../localDB';

describe('LocalDB repairDataIntegrity', () => {
  beforeEach(() => {
    LocalDB.clearInstance();
  });

  afterEach(() => {
    LocalDB.clearInstance();
  });

  it('repairs deleted flag mismatch, missing folder and mixed timestamp types', async () => {
    const userId = 'repair-user-a';
    const db = await getLocalDb(userId);

    await db.cards.put({
      id: 'card-a',
      userId,
      folderId: null,
      isDeleted: true,
      deletedAt: null,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
      questionText: 'Q',
      answerText: 'A',
      blocks: [],
    } as any);

    const result = await db.repairDataIntegrity(userId);
    const repaired = await db.cards.get('card-a');

    expect(result.issues.some((i) => i.code === 'DELETED_FLAG_MISMATCH')).toBe(true);
    expect(result.issues.some((i) => i.code === 'MISSING_FOLDER')).toBe(true);
    expect(result.issues.some((i) => i.code === 'TIMESTAMP_TYPE_MIXED')).toBe(true);
    expect(repaired?.isDeleted).toBe(false);
    expect(repaired?.folderId).toBe('RESCUE_ORPHANS_FOLDER');
    expect(repaired?.createdAt instanceof Date).toBe(true);
    expect(repaired?.updatedAt instanceof Date).toBe(true);
  });

  it('repairs block order/text mismatch and remains idempotent', async () => {
    const userId = 'repair-user-b';
    const db = await getLocalDb(userId);

    await db.folders.put({
      id: 'folder-1',
      folderId: 'folder-1',
      folderName: 'F1',
      userId,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await db.cards.put({
      id: 'card-b',
      userId,
      folderId: 'folder-1',
      isDeleted: false,
      questionText: 'outdated-q',
      answerText: 'outdated-a',
      createdAt: new Date(),
      updatedAt: new Date(),
      blocks: [
        { side: 'question', type: 'question', text: 'Q from block' },
        { side: 'answer', type: 'answer', text: 'A from block' },
      ],
    } as any);

    const first = await db.repairDataIntegrity(userId);
    const onceRepaired = await db.cards.get('card-b');
    const second = await db.repairDataIntegrity(userId);

    expect(first.issues.some((i) => i.code === 'BLOCK_ORDER_INDEX_MISSING')).toBe(true);
    expect(first.issues.some((i) => i.code === 'TEXT_BLOCK_MISMATCH')).toBe(true);
    expect(onceRepaired?.blocks?.[0]?.orderIndex).toBe(0);
    expect(onceRepaired?.blocks?.[1]?.orderIndex).toBe(1);
    expect(onceRepaired?.questionText).toBe('Q from block');
    expect(onceRepaired?.answerText).toBe('A from block');
    expect(second.issues.some((i) => i.code === 'BLOCK_ORDER_INDEX_MISSING')).toBe(false);
    expect(second.issues.some((i) => i.code === 'TEXT_BLOCK_MISMATCH')).toBe(false);
  });
});
