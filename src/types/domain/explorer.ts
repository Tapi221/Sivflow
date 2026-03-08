import type { Card } from "./card";
import type { DocumentItem } from "./document";

export type ExplorerItem =
  | { type: "card"; data: Card }
  | { type: "document"; data: DocumentItem };

export type SelectedExplorerItem =
  | { type: "card"; id: string }
  | { type: "document"; id: string }
  | { type: "directory" }
  | { type: "gallery" }
  | { type: "calendar" }
  | { type: "settings" }
  | { type: "trash" }
  | null;



