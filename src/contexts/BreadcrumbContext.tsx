/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { areBreadcrumbCrumbsEqual } from "@/features/breadcrumbs/builders";
import type { BreadcrumbCrumb } from "@/features/breadcrumbs/breadcrumbs.types";

type BreadcrumbContextValue = {
  extraCrumbs: BreadcrumbCrumb[];
  setExtraCrumbs: (crumbs: BreadcrumbCrumb[]) => void;
};

type BreadcrumbActionsContextValue = {
  setExtraCrumbs: (crumbs: BreadcrumbCrumb[]) => void;
  setAction: (action: React.ReactNode) => void;
};

const noopSetExtraCrumbs = (_crumbs: BreadcrumbCrumb[]): void => {};
const noopSetAction = (_action: React.ReactNode): void => {};

const BreadcrumbExtraCrumbsContext = createContext<BreadcrumbCrumb[]>([]);
const BreadcrumbActionContext = createContext<React.ReactNode>(null);
const BreadcrumbActionsContext = createContext<BreadcrumbActionsContextValue>({
  setExtraCrumbs: noopSetExtraCrumbs,
  setAction: noopSetAction,
});

export const BreadcrumbProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [extraCrumbs, setExtraCrumbsState] = useState<BreadcrumbCrumb[]>([]);
  const [action, setAction] = useState<React.ReactNode>(null);

  const setExtraCrumbs = useCallback((crumbs: BreadcrumbCrumb[]) => {
    setExtraCrumbsState((prev) =>
      areBreadcrumbCrumbsEqual(prev, crumbs) ? prev : crumbs,
    );
  }, []);

  const actionsValue = useMemo<BreadcrumbActionsContextValue>(
    () => ({
      setExtraCrumbs,
      setAction,
    }),
    [setExtraCrumbs],
  );

  return (
    <BreadcrumbActionsContext.Provider value={actionsValue}>
      <BreadcrumbActionContext.Provider value={action}>
        <BreadcrumbExtraCrumbsContext.Provider value={extraCrumbs}>
          {children}
        </BreadcrumbExtraCrumbsContext.Provider>
      </BreadcrumbActionContext.Provider>
    </BreadcrumbActionsContext.Provider>
  );
};

export const useBreadcrumbExtraCrumbs = (): BreadcrumbCrumb[] => {
  return useContext(BreadcrumbExtraCrumbsContext);
};

export const useBreadcrumbAction = (): React.ReactNode => {
  return useContext(BreadcrumbActionContext);
};

export const useSetBreadcrumbCrumbs =
  (): BreadcrumbActionsContextValue["setExtraCrumbs"] => {
    return useContext(BreadcrumbActionsContext).setExtraCrumbs;
  };

export const useSetBreadcrumbAction =
  (): BreadcrumbActionsContextValue["setAction"] => {
    return useContext(BreadcrumbActionsContext).setAction;
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
