export type CardSelectedItem = { type: "card"; id: string };
export type CardSetSelectedItem = { type: "cardSet"; id: string };
export type DocumentSelectedItem = { type: "document"; id: string };
export type RootSelectedItem =
  | { type: "directory" }
  | { type: "gallery" }
  | { type: "calendar" }
  | { type: "settings" }
  | { type: "trash" };

export type SelectedExplorerItem =
  | CardSelectedItem
  | CardSetSelectedItem
  | DocumentSelectedItem
  | RootSelectedItem
  | null;
