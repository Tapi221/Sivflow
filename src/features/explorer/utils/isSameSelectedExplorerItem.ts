import type { SelectedExplorerItem } from "../contracts/explorerSelection";

export const isSameSelectedExplorerItem = (
  left: SelectedExplorerItem,
  right: SelectedExplorerItem,
) => {
  if (left === right) return true;
  if (!left || !right) return left === right;
  if (left.type !== right.type) return false;
  return "id" in left && "id" in right ? left.id === right.id : true;
};
