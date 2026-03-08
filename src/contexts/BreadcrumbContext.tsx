import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";

export type BreadcrumbCrumb = {
  label: string;
  /** react-router-dom の to 文字列。省略時はクリック不可。 */
  to?: string;
};

type BreadcrumbContextValue = {
  extraCrumbs: BreadcrumbCrumb[];
  setExtraCrumbs: (crumbs: BreadcrumbCrumb[]) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  extraCrumbs: [],
  setExtraCrumbs: () => {},
});

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [extraCrumbs, setExtraCrumbsState] = useState<BreadcrumbCrumb[]>([]);

  const setExtraCrumbs = useCallback((crumbs: BreadcrumbCrumb[]) => {
    setExtraCrumbsState(crumbs);
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ extraCrumbs, setExtraCrumbs }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbContext() {
  return useContext(BreadcrumbContext);
}
