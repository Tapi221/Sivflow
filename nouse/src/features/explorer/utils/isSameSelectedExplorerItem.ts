import type { SelectedExplorerItem } from "@/types";



const isSameSelectedExplorerItem = (a: SelectedExplorerItem, b: SelectedExplorerItem): boolean => {
  if (a === b) return true;
  if (!a || !b) return a === b;
  if (a.type !== b.type) return false;

  return "id" in a && "id" in b ? a.id === b.id : true;
};



export { isSameSelectedExplorerItem };
