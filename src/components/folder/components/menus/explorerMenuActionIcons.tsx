const createMenuIconClassName = "h-[15px] w-[15px] shrink-0";
const folderContextMenuIconClassName = "h-[15px] w-[15px] shrink-0";

export const FolderContextFolderIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={folderContextMenuIconClassName}
    aria-hidden="true"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

export const FolderContextCardSetIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#2f6fff"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={folderContextMenuIconClassName}
    aria-hidden="true"
  >
    <line x1="12" y1="4" x2="12" y2="20" />
    <line x1="4" y1="12" x2="20" y2="12" />
  </svg>
);

export const FolderContextRenameIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={folderContextMenuIconClassName}
    aria-hidden="true"
  >
    <rect x="6" y="6" width="12" height="12" rx="1" />
  </svg>
);

export const FolderContextTrashIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={folderContextMenuIconClassName}
    aria-hidden="true"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

export const CreateFolderIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className={createMenuIconClassName}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-2h6a2 2 0 0 1 2 2v1" />
    <line x1="17" y1="11" x2="17" y2="17" />
    <line x1="14" y1="14" x2="20" y2="14" />
  </svg>
);

export const CreateCardSetIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className={createMenuIconClassName}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="2" y="7" width="13" height="10" rx="1.5" />
    <rect x="7" y="5" width="13" height="10" rx="1.5" />
  </svg>
);

export const CreateCardIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className={createMenuIconClassName}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="6" width="18" height="13" rx="1.5" />
    <line x1="3" y1="11" x2="21" y2="11" />
    <line x1="8" y1="6" x2="8" y2="11" />
  </svg>
);

export const AddDocumentIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className={createMenuIconClassName}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="12" x2="12" y2="18" />
    <polyline points="9 15 12 18 15 15" />
  </svg>
);

export const BulkImportIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className={createMenuIconClassName}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path
      d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-5-6H8z"
      opacity={0.35}
    />
    <path d="M11 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9l-5-6h-3z" />
    <polyline points="11 9 16 9" />
    <line x1="13.5" y1="13" x2="13.5" y2="17" />
    <polyline points="11.5 15.2 13.5 17 15.5 15.2" />
  </svg>
);
