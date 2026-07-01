import type { ExplorerBreadcrumbContext } from "@/features/breadcrumbs/breadcrumbs.types";
import { areExplorerBreadcrumbContextsEqual as areContextsEqual, EMPTY_EXPLORER_BREADCRUMB_CONTEXT as EMPTY_CONTEXT } from "@/features/breadcrumbs/breadcrumbs.types";



const EMPTY_EXPLORER_BREADCRUMB_CONTEXT = EMPTY_CONTEXT;
const areExplorerBreadcrumbContextsEqual = areContextsEqual;



export { EMPTY_EXPLORER_BREADCRUMB_CONTEXT, areExplorerBreadcrumbContextsEqual };


export type { ExplorerBreadcrumbContext };
