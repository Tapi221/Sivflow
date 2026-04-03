/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";

export type BreadcrumbCrumb = {
  label: string;
  /** react-router-dom の to 文字列。省略時はクリック不可。 */
  to?: string;
  /** クリック時にサイドバー選択を同期するフォルダ ID。null はルートへ戻す。 */
  folderId?: string | null;
};

type BreadcrumbContextValue = {
  extraCrumbs: BreadcrumbCrumb[];
  setExtraCrumbs: (crumbs: BreadcrumbCrumb[]) => void;
  registerFolderSelectHandler: (fn: (folderId: string | null) => void) => void;
  notifyFolderSelect: (folderId: string | null) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  extraCrumbs: [],
  setExtraCrumbs: () => {},
  registerFolderSelectHandler: () => {},
  notifyFolderSelect: () => {},
});

export function BreadcrumbProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [extraCrumbs, setExtraCrumbsState] = useState<BreadcrumbCrumb[]>([]);
  const folderSelectHandlerRef = useRef<
    ((folderId: string | null) => void) | null
  >(null);

  const setExtraCrumbs = useCallback((crumbs: BreadcrumbCrumb[]) => {
    setExtraCrumbsState(crumbs);
  }, []);

  const registerFolderSelectHandler = useCallback(
    (fn: (folderId: string | null) => void) => {
      folderSelectHandlerRef.current = fn;
    },
    [],
  );

  const notifyFolderSelect = useCallback((folderId: string | null) => {
    folderSelectHandlerRef.current?.(folderId);
  }, []);

  return (
    <BreadcrumbContext.Provider
      value={{
        extraCrumbs,
        setExtraCrumbs,
        registerFolderSelectHandler,
        notifyFolderSelect,
      }}
    >
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbContext() {
  return useContext(BreadcrumbContext);
}





