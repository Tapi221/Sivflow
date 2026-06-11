import type { SelectedExplorerItem } from "@/types";



const getSelectedCardId = (selectedItem: SelectedExplorerItem): string | null => (selectedItem?.type === "card" ? selectedItem.id : null);



export { getSelectedCardId };
