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

/**
 * パンくずの配列が実質的に等しいかどうかを判定する
 */
const areCrumbsEqual = (
  a: BreadcrumbCrumb[],
  b: BreadcrumbCrumb[],
): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  return a.every((crumb, index) => {
    const other = b[index];
    return (
      crumb.label === other.label &&
      crumb.to === other.to &&
      crumb.folderId === other.folderId
    );
  });
};

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
    // コンテンツが変更されている場合のみ状態を更新し、不要な再レンダリングを抑制する
    setExtraCrumbsState((prev) =>
      areCrumbsEqual(prev, crumbs) ? prev : crumbs,
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
