import { getSelectedCardId } from "@/features/explorer/utils/getSelectedCardId";
import { getSelectedDocumentId } from "@/features/explorer/utils/getSelectedDocumentId";
import type { SelectedExplorerItem } from "@/types";



const buildExplorerSelectedState = (selectedItem: SelectedExplorerItem) => ({ selectedCardId: getSelectedCardId(selectedItem), selectedDocumentId: getSelectedDocumentId(selectedItem) });



export { buildExplorerSelectedState };
