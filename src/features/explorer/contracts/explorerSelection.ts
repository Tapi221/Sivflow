export type { SelectedExplorerItem } from "@/types";

export type CardSelectedItem = Extract<
  import("@/types").SelectedExplorerItem,
  { type: "card" }
>;

export type DocumentSelectedItem = Extract<
  import("@/types").SelectedExplorerItem,
  { type: "document" }
>;

export type RootSelectedItem = Extract<
  import("@/types").SelectedExplorerItem,
  { type: "directory" | "gallery" | "calendar" | "trash" }
>;
