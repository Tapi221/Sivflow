import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { BreadcrumbCrumb } from "@/features/breadcrumbs/breadcrumbs.types";
import { areBreadcrumbCrumbsEqual } from "@/features/breadcrumbs/builders";



type BreadcrumbContextValue = {
  extraCrumbs: BreadcrumbCrumb[];
  setExtraCrumbs: (crumbs: BreadcrumbCrumb[]) => void;
};
type BreadcrumbActionsContextValue = {
  setExtraCrumbs: (crumbs: BreadcrumbCrumb[]) => void;
};
type BreadcrumbProviderProps = {
  children: ReactNode;
};



const BreadcrumbExtraCrumbsContext = createContext<BreadcrumbCrumb[]>([]);



const noopSetExtraCrumbs = (_crumbs: BreadcrumbCrumb[]): void => {};



const BreadcrumbActionsContext = createContext<BreadcrumbActionsContextValue>({
  setExtraCrumbs: noopSetExtraCrumbs,
});



const useBreadcrumbExtraCrumbs = (): BreadcrumbCrumb[] => {
  return useContext(BreadcrumbExtraCrumbsContext);
};
const useSetBreadcrumbCrumbs = (): BreadcrumbActionsContextValue["setExtraCrumbs"] => {
  return useContext(BreadcrumbActionsContext).setExtraCrumbs;
};
const useBreadcrumbContext = (): BreadcrumbContextValue => {
  const extraCrumbs = useBreadcrumbExtraCrumbs();
  const setExtraCrumbs = useSetBreadcrumbCrumbs();

  return useMemo(
    () => ({
      extraCrumbs,
      setExtraCrumbs,
    }),
    [extraCrumbs, setExtraCrumbs],
  );
};



const BreadcrumbProvider = ({ children }: BreadcrumbProviderProps) => {
  const [extraCrumbs, setExtraCrumbsState] = useState<BreadcrumbCrumb[]>([]);

  const setExtraCrumbs = useCallback((crumbs: BreadcrumbCrumb[]) => {
    setExtraCrumbsState((prev) => (areBreadcrumbCrumbsEqual(prev, crumbs) ? prev : crumbs));
  }, []);

  const actionsValue = useMemo<BreadcrumbActionsContextValue>(
    () => ({
      setExtraCrumbs,
    }),
    [setExtraCrumbs],
  );

  return (
    <BreadcrumbActionsContext.Provider value={actionsValue}>
      <BreadcrumbExtraCrumbsContext.Provider value={extraCrumbs}>{children}</BreadcrumbExtraCrumbsContext.Provider>
    </BreadcrumbActionsContext.Provider>
  );
};



export { BreadcrumbProvider, useBreadcrumbExtraCrumbs, useSetBreadcrumbCrumbs, useBreadcrumbContext };
