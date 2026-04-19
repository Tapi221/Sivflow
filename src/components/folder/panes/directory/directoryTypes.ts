export type DirectoryTreeNode = {
  id: string;
  kind: "folder" | "card" | "pdf";
  name: string;
  sourceCardId?: string;
  tags: string[];
  hasUncertainty: boolean;
  isBookmarked: boolean;
  showTags: boolean;
  children: DirectoryTreeNode[];
};

export type DirectoryBadgeVisibility = {
  uncertainty: boolean;
  bookmarked: boolean;
  tags: boolean;
};

export type DirectoryMindMapChip = {
  id: string;
  kind: "card" | "pdf";
  label: string;
  sourceCardId?: string;
  tags: string[];
  hasUncertainty: boolean;
  isBookmarked: boolean;
  showTags: boolean;
};

export type DirectoryMindMapNodeData = {
  label: string;
  chips: DirectoryMindMapChip[];
  hiddenChipCount: number;
  folderCount: number;
  itemCount: number;
  side: "left" | "right";
  isRoot?: boolean;
  badgeVisibility: DirectoryBadgeVisibility;
  getTagColor: (tagNameOrId: string) => string;
  onCardClick: (cardId: string) => void;
};

