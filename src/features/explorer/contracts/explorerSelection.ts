

type CardSelectedItem = Extract<import("@/types").SelectedExplorerItem, { type: "card"; }>;
type DocumentSelectedItem = Extract<import("@/types").SelectedExplorerItem, { type: "document"; }>;
type RootSelectedItem = Extract<import("@/types").SelectedExplorerItem, { type: "gallery" | "calendar" | "trash"; }>;

export type { SelectedExplorerItem } from "@/types";
export type { CardSelectedItem, DocumentSelectedItem, RootSelectedItem };
