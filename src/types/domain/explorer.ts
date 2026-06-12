import type { Card } from "@/types/domain/card";
import type { DocumentItem } from "@/types/domain/document";
import type { Note } from "@/types/domain/note";

type ExplorerItem = | { type: "card"; data: Card; }
  | { type: "document"; data: DocumentItem; }
  | { type: "note"; data: Note; };
type SelectedExplorerItem = | { type: "card"; id: string; }
  | { type: "cardSet"; id: string; }
  | { type: "document"; id: string; }
  | { type: "note"; id: string; }
  | { type: "gallery"; }
  | { type: "calendar"; }
  | { type: "settings"; }
  | { type: "trash"; }
  | null;

export type { ExplorerItem, SelectedExplorerItem };
