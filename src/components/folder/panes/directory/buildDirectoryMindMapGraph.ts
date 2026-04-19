import { Position, type Edge, type Node } from "@xyflow/react";

import type {
  DirectoryBadgeVisibility,
  DirectoryMindMapChip,
  DirectoryMindMapNodeData,
  DirectoryTreeNode,
} from "./directoryTypes";

const ROOT_ID = "directory-root";
const ROOT_LABEL = "ディレクトリ";
const HORIZONTAL_GAP = 360;
const VERTICAL_GAP = 150;
const MAX_VISIBLE_CHIPS = 4;

type MindMapSide = "left" | "right";

const splitDirectoryChildren = (children: DirectoryTreeNode[]) => {
  const folders: DirectoryTreeNode[] = [];
  const items: DirectoryTreeNode[] = [];

  children.forEach((child) => {
    if (child.kind === "folder") {
      folders.push(child);
      return;
    }

    items.push(child);
  });

  return { folders, items };
};

const compressFolderNode = (node: DirectoryTreeNode): DirectoryTreeNode => {
  if (node.kind !== "folder") {
    return node;
  }

  let currentNode = node;
  const labelParts = [currentNode.name];
  let lastNodeId = currentNode.id;

  while (true) {
    const { folders, items } = splitDirectoryChildren(currentNode.children);

    if (items.length > 0 || folders.length !== 1) {
      return {
        ...node,
        id: `folder-chain:${node.id}:${lastNodeId}`,
        name: labelParts.join(" / "),
        children: [
          ...folders.map((child) => compressFolderNode(child)),
          ...items,
        ],
      };
    }

    const [onlyChild] = folders;
    currentNode = onlyChild;
    lastNodeId = currentNode.id;
    labelParts.push(currentNode.name);
  }
};

const compressRootNodes = (rootNodes: DirectoryTreeNode[]) =>
  rootNodes.map((node) => compressFolderNode(node));

const countSubtreeLeaves = (node: DirectoryTreeNode): number => {
  const { folders } = splitDirectoryChildren(node.children);

  if (folders.length === 0) {
    return 1;
  }

  return folders.reduce((sum, child) => sum + countSubtreeLeaves(child), 0);
};

const toChip = (node: DirectoryTreeNode): DirectoryMindMapChip => ({
  id: node.id,
  kind: node.kind,
  label: node.name,
  sourceCardId: node.sourceCardId,
  tags: node.tags,
  hasUncertainty: node.hasUncertainty,
  isBookmarked: node.isBookmarked,
  showTags: node.showTags,
});

const createFolderFlowNode = ({
  id,
  label,
  side,
  x,
  y,
  chips,
  folderCount,
  itemCount,
  badgeVisibility,
  getTagColor,
  onCardClick,
}: {
  id: string;
  label: string;
  side: MindMapSide;
  x: number;
  y: number;
  chips: DirectoryTreeNode[];
  folderCount: number;
  itemCount: number;
  badgeVisibility: DirectoryBadgeVisibility;
  getTagColor: (tagNameOrId: string) => string;
  onCardClick: (cardId: string) => void;
}): Node<DirectoryMindMapNodeData> => ({
  id,
  type: "directoryFolderNode",
  position: { x, y },
  sourcePosition: side === "left" ? Position.Left : Position.Right,
  targetPosition: side === "left" ? Position.Right : Position.Left,
  selectable: false,
  draggable: false,
  data: {
    label,
    side,
    chips: chips.slice(0, MAX_VISIBLE_CHIPS).map((chip) => toChip(chip)),
    hiddenChipCount: Math.max(chips.length - MAX_VISIBLE_CHIPS, 0),
    folderCount,
    itemCount,
    badgeVisibility,
    getTagColor,
    onCardClick,
  },
});

const createRootFlowNode = ({
  badgeVisibility,
  getTagColor,
  onCardClick,
}: {
  badgeVisibility: DirectoryBadgeVisibility;
  getTagColor: (tagNameOrId: string) => string;
  onCardClick: (cardId: string) => void;
}): Node<DirectoryMindMapNodeData> => ({
  id: ROOT_ID,
  type: "directoryRootNode",
  position: { x: 0, y: 0 },
  selectable: false,
  draggable: false,
  data: {
    label: ROOT_LABEL,
    side: "right",
    chips: [],
    hiddenChipCount: 0,
    folderCount: 0,
    itemCount: 0,
    badgeVisibility,
    getTagColor,
    onCardClick,
    isRoot: true,
  },
});

const getSideStartY = (leafCount: number) => {
  if (leafCount <= 1) {
    return 0;
  }

  return -((leafCount - 1) * VERTICAL_GAP) / 2;
};

const appendSubtree = ({
  node,
  side,
  parentId,
  depth,
  startY,
  nodes,
  edges,
  badgeVisibility,
  getTagColor,
  onCardClick,
}: {
  node: DirectoryTreeNode;
  side: MindMapSide;
  parentId: string;
  depth: number;
  startY: number;
  nodes: Array<Node<DirectoryMindMapNodeData>>;
  edges: Edge[];
  badgeVisibility: DirectoryBadgeVisibility;
  getTagColor: (tagNameOrId: string) => string;
  onCardClick: (cardId: string) => void;
}) => {
  const { folders, items } = splitDirectoryChildren(node.children);
  const leafCount = countSubtreeLeaves(node);
  const centerY =
    folders.length === 0
      ? startY
      : startY + ((leafCount - 1) * VERTICAL_GAP) / 2;

  const flowNodeId = `folder:${node.id}`;
  const x =
    side === "left" ? -(depth * HORIZONTAL_GAP) : depth * HORIZONTAL_GAP;

  nodes.push(
    createFolderFlowNode({
      id: flowNodeId,
      label: node.name,
      side,
      x,
      y: centerY,
      chips: items,
      folderCount: folders.length,
      itemCount: items.length,
      badgeVisibility,
      getTagColor,
      onCardClick,
    }),
  );

  edges.push({
    id: `${parentId}->${flowNodeId}`,
    source: parentId,
    target: flowNodeId,
    sourceHandle:
      parentId === ROOT_ID ? (side === "left" ? "left" : "right") : "outer",
    targetHandle: "inner",
    style: {
      stroke: "rgba(148, 163, 184, 0.75)",
      strokeWidth: 1.5,
    },
  });

  let cursorY = startY;

  folders.forEach((child) => {
    const childLeaves = countSubtreeLeaves(child);

    appendSubtree({
      node: child,
      side,
      parentId: flowNodeId,
      depth: depth + 1,
      startY: cursorY,
      nodes,
      edges,
      badgeVisibility,
      getTagColor,
      onCardClick,
    });

    cursorY += childLeaves * VERTICAL_GAP;
  });
};

export const buildDirectoryMindMapGraph = ({
  rootNodes,
  badgeVisibility,
  getTagColor,
  onCardClick,
}: {
  rootNodes: DirectoryTreeNode[];
  badgeVisibility: DirectoryBadgeVisibility;
  getTagColor: (tagNameOrId: string) => string;
  onCardClick: (cardId: string) => void;
}) => {
  const compressedRoots = compressRootNodes(rootNodes);
  const nodes: Array<Node<DirectoryMindMapNodeData>> = [
    createRootFlowNode({ badgeVisibility, getTagColor, onCardClick }),
  ];
  const edges: Edge[] = [];

  let leftLeafTotal = 0;
  let rightLeafTotal = 0;

  const assignedRoots = compressedRoots.map((node) => {
    const leafCount = countSubtreeLeaves(node);
    const side: MindMapSide =
      rightLeafTotal <= leftLeafTotal ? "right" : "left";

    if (side === "right") {
      rightLeafTotal += leafCount;
    } else {
      leftLeafTotal += leafCount;
    }

    return { node, side, leafCount };
  });

  let leftCursorY = getSideStartY(leftLeafTotal);
  let rightCursorY = getSideStartY(rightLeafTotal);

  assignedRoots.forEach(({ node, side, leafCount }) => {
    if (side === "left") {
      appendSubtree({
        node,
        side,
        parentId: ROOT_ID,
        depth: 1,
        startY: leftCursorY,
        nodes,
        edges,
        badgeVisibility,
        getTagColor,
        onCardClick,
      });

      leftCursorY += leafCount * VERTICAL_GAP;
      return;
    }

    appendSubtree({
      node,
      side,
      parentId: ROOT_ID,
      depth: 1,
      startY: rightCursorY,
      nodes,
      edges,
      badgeVisibility,
      getTagColor,
      onCardClick,
    });

    rightCursorY += leafCount * VERTICAL_GAP;
  });

  return { nodes, edges };
};
