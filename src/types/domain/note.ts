import type { BaseEntity } from "./base";

export type NoteEditor = "blocknote";
export type NoteContentVersion = 1;
export type NoteBlockContent = Record<string, unknown>[];

export interface Note extends BaseEntity {
  folderId: string;
  orderIndex: number;
  title: string;
  content: NoteBlockContent;
  contentText?: string;
  contentVersion: NoteContentVersion;
  editor: NoteEditor;
  tags?: string[];
  deletedAt?: Date | null;
}
