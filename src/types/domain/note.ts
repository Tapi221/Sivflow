import type { BaseEntity } from "./base";



type NoteEditor = "plate";
type NoteContentVersion = 2;
type NoteBlockContent = Record<string, unknown>[];
interface Note extends BaseEntity {
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

export type { NoteEditor, NoteContentVersion, NoteBlockContent, Note };
