import type { ExplorerTreeNode } from "@/components/folder/explorer/tree/arboristAdapter";

type DropValidationNode = {
  id: string;
  data?: { kind?: ExplorerTreeNode["kind"] };
  parent?: DropValidationNode | null;
};

export const shouldDisableExplorerDrop = ({
  parentNode,
  dragNodes,
}: {
  parentNode: DropValidationNode;
  dragNodes: DropValidationNode[];
}) => {
  const parentKind = parentNode?.data?.kind;
  if (parentKind === "card" || parentKind === "document") {
    return true;
  }

  if (parentKind === "cardSet") {
    return dragNodes.some((dragNode) => dragNode.data?.kind !== "card");
  }

  const isDropToRoot = !parentNode?.data || parentNode.data.kind !== "folder";
  for (const dragNode of dragNodes) {
    const dragKind = dragNode.data?.kind;

    if (dragKind === "folder") {
      let check: DropValidationNode | null | undefined = parentNode;
      while (check) {
        if (check.id === dragNode.id) return true;
        check = check.parent;
      }
      continue;
    }

    if (
      isDropToRoot &&
      (dragKind === "cardSet" || dragKind === "card" || dragKind === "document")
    ) {
      return true;
    }

    if (parentKind === "folder" && dragKind === "card") {
      return true;
    }
  }

  return false;
};
