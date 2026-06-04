/* eslint-disable react-refresh/only-export-components */
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

const noopSetExtraCrumbs = (_crumbs: BreadcrumbCrumb[]): void => {};

const BreadcrumbExtraCrumbsContext = createContext<BreadcrumbCrumb[]>([]);
const BreadcrumbActionsContext = createContext<BreadcrumbActionsContextValue>({
  setExtraCrumbs: noopSetExtraCrumbs,
});

export const BreadcrumbProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [extraCrumbs, setExtraCrumbsState] = useState<BreadcrumbCrumb[]>([]);

  const setExtraCrumbs = useCallback((crumbs: BreadcrumbCrumb[]) => {
    setExtraCrumbsState((prev) =>
      areBreadcrumbCrumbsEqual(prev, crumbs) ? prev : crumbs,
    );
  }, []);

  const actionsValue = useMemo<BreadcrumbActionsContextValue>(
    () => ({
      setExtraCrumbs,
    }),
    [setExtraCrumbs],
  );

  return (
    <BreadcrumbActionsContext.Provider value={actionsValue}>
      <BreadcrumbExtraCrumbsContext.Provider value={extraCrumbs}>
        {children}
      </BreadcrumbExtraCrumbsContext.Provider>
    </BreadcrumbActionsContext.Provider>
  );
};

export const useBreadcrumbExtraCrumbs = (): BreadcrumbCrumb[] => {
  return useContext(BreadcrumbExtraCrumbsContext);
};

export const useSetBreadcrumbCrumbs =
  (): BreadcrumbActionsContextValue["setExtraCrumbs"] => {
    return useContext(BreadcrumbActionsContext).setExtraCrumbs;
  };

export const useBreadcrumbContext = (): BreadcrumbContextValue => {
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
