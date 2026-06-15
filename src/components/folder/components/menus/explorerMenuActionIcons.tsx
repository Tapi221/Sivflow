import { ExplorerChromeCardIcon, ExplorerChromeCardSetIcon, ExplorerChromeFolderIcon, ExplorerChromePdfIcon } from "@/components/explorer/icons";



const createMenuIconClassName = "h-3.5 w-3.5 shrink-0";
const folderContextMenuIconClassName = "h-3.5 w-3.5 shrink-0";



const FolderContextFolderIcon = () => (<ExplorerChromeFolderIcon size={15} className={folderContextMenuIconClassName} />);
const FolderContextCardSetIcon = () => (<ExplorerChromeCardSetIcon size={15} className={folderContextMenuIconClassName} />);
const FolderContextRenameIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={folderContextMenuIconClassName} aria-hidden="true" > <rect x="6" y="6" width="12" height="12" rx="1" /> </svg>);
const FolderContextTrashIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={folderContextMenuIconClassName} aria-hidden="true" > <polyline points="3 6 5 6 21 6" /> <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /> <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /> <line x1="10" y1="11" x2="10" y2="17" /> <line x1="14" y1="11" x2="14" y2="17" /> </svg>);
const CreateFolderIcon = () => (<ExplorerChromeFolderIcon size={15} className={createMenuIconClassName} />);
const CreateCardSetIcon = () => (<ExplorerChromeCardSetIcon size={15} className={createMenuIconClassName} />);
const CreateCardIcon = () => (<ExplorerChromeCardIcon size={15} className={createMenuIconClassName} />);
const AddDocumentIcon = () => (<ExplorerChromePdfIcon size={15} className={createMenuIconClassName} />);
const BulkImportIcon = () => (<svg viewBox="0 0 24 24" className={createMenuIconClassName} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" > <path d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-5-6H8z" opacity={0.35} /> <path d="M11 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9l-5-6h-3z" /> <polyline points="11 9 16 9" /> <line x1="13.5" y1="13" x2="13.5" y2="17" /> <polyline points="11.5 15.2 13.5 17 15.5 15.2" /> </svg>);



export { FolderContextFolderIcon, FolderContextCardSetIcon, FolderContextRenameIcon, FolderContextTrashIcon, CreateFolderIcon, CreateCardSetIcon, CreateCardIcon, AddDocumentIcon, BulkImportIcon };
