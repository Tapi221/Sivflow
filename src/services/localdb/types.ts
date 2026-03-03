import type { LocalDB } from './LocalDB';
import type { InMemoryLocalDB } from '../InMemoryLocalDB';

// Map機能は削除済みだが、旧DB互換（読み取り/救出）とDexie型のために最小定義だけ残す
export type CardRelation = {
  id: string;
  userId: string;
  fromCardId?: string;
  toCardId?: string;
  folderId?: string | null;
  updatedAt?: Date;
  createdAt?: Date;
  isDeleted?: boolean;
  [key: string]: unknown;
};

export type ProjectMap = {
  id: string;
  userId: string;
  folderId?: string;
  name?: string;
  updatedAt?: Date;
  createdAt?: Date;
  isDeleted?: boolean;
  [key: string]: unknown;
};

export type TagLegacyRecord = {
  name: string;
  color: string;
  userId: string;
  rootFolderId: string;
  updatedAt: Date;
};

export type TagV2Record = TagLegacyRecord & {
  id?: string;
  categoryId?: string;
  parentId?: string;
};

/** tags_v3 のレコード型（id が主体） */
export type TagV3Record = {
  id: string;
  name: string;
  nameLower: string;
  color: string;
  userId: string;
  updatedAt: Date;
  categoryId?: 'subject' | 'exam' | 'difficulty' | 'type';
  parentId?: string;
};

export type LocalDBLike = LocalDB | InMemoryLocalDB;
export type LocalDBInstance = LocalDBLike;
