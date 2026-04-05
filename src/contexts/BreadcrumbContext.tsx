/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { areBreadcrumbCrumbsEqual } from "@/features/breadcrumbs/builders";
import type { BreadcrumbCrumb } from "@/features/breadcrumbs/types";

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

export const BreadcrumbProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [extraCrumbs, setExtraCrumbsState] = useState<BreadcrumbCrumb[]>([]);
  const folderSelectHandlerRef = useRef<
    ((folderId: string | null) => void) | null
  >(null);

  const setExtraCrumbs = useCallback((crumbs: BreadcrumbCrumb[]) => {
    setExtraCrumbsState((prev) =>
      areBreadcrumbCrumbsEqual(prev, crumbs) ? prev : crumbs,
    );
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
};

export const useBreadcrumbContext = () => {
  return useContext(BreadcrumbContext);
};
