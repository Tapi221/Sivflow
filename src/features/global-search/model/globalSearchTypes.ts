export type GlobalSearchItemKind =
  | "folder"
  | "cardSet"
  | "card"
  | "document"
  | "action";

export type GlobalSearchIconKind =
  | "folder"
  | "cardSet"
  | "card"
  | "document"
  | "folders"
  | "calendar"
  | "gallery"
  | "directory"
  | "trash"
  | "settings"
  | "tagMap";

export type GlobalSearchItem = {
  id: string;
  value: string;
  kind: GlobalSearchItemKind;
  title: string;
  subtitle?: string;
  keywords: string[];
  timestampValue?: unknown;
  priority?: number;
  iconKind?: GlobalSearchIconKind;
  onSelect: () => void;
};

export type GlobalSearchSource = {
  sourceId: string;
  items: GlobalSearchItem[];
};
