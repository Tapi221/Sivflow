type SearchItemKind = "folder" | "cardSet" | "card" | "document" | "action";
type SearchIconKind = "folder" | "cardSet" | "card" | "document" | "folders" | "calendar" | "gallery" | "directory" | "trash" | "settings" | "tagMap";
type SearchItem = {
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
type SearchSource = {
  sourceId: string;
  items: SearchItem[];
};

export type { SearchItemKind, SearchIconKind, SearchItem, SearchSource };
