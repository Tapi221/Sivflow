import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useOutletContext } from "react-router-dom";
import { SidebarOpenIcon } from "@/chip/icons/icons.sidebar";
import TreeViewLayout from "@/components/folder/layout/TreeViewLayout";
import { CarvePanel } from "@/components/panel/CarvePanel.desktop";
import { areExplorerBreadcrumbContextsEqual, EMPTY_EXPLORER_BREADCRUMB_CONTEXT, type BreadcrumbCrumb, type