import type { SelectedExplorerItem } from "@/types";



const getSelectedDocumentId = (selectedItem: SelectedExplorerItem): string | null => selectedItem?.type === "document" ? selectedItem.id : null;



export { getSelectedDocumentId };
