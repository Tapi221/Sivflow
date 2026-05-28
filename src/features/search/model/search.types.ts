export type SearchItemKind = "folder" | "cardSet" | "card" | "document" | "action";

export type SearchIconKind = "folder" | "cardSet" | "card" | "document" | "folders" | "calendar" | "gallery" | "directory" | "trash" | "settings" | "tagMap";

export type SearchItem = {
  id: string;
  value: string;
  kind: SearchItemKind;
  title: string;
  subtitle?: string;
  keywords: string[];
  timestampValue?: unknown;
  priority?: number;
  iconKind?: SearchIconKind;
  onSelect: () => void;
};

export type SearchSource = {
  sourceId: string;
  items: SearchItem[];
};
