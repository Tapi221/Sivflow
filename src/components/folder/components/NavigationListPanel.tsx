import type { ReactNode } from "react";

import { FilterPanelSurface } from "@/components/panel/FilterPanelSurface";
import { cn } from "@/lib/utils";

import {
  RootFolderPanelList,
  type RootFolderPanelListProps,
} from "./RootFolderPanelList";

type NavigationListPanelProps = RootFolderPanelListProps & {
  title?: string;
  headerAction?: ReactNode;
  sections?: ReactNode;
  panelClassName?: string;
  listClassName?: string;
};

export const NavigationListPanel = ({
  title = "移動",
  headerAction,
  sections,
  panelClassName,
  listClassName,
  ...listProps
}: NavigationListPanelProps) => {
  return (
    <FilterPanelSurface
      title={title}
      headerAction={headerAction}
      sections={sections}
      className={cn("h-full min-h-0", panelClassName)}
      bodyClassName="p-0"
    >
      <RootFolderPanelList
        {...listProps}
        className={cn("h-auto overflow-visible py-1", listClassName)}
        enableScrollEdgeFade={false}
      />
    </FilterPanelSurface>
  );
};
