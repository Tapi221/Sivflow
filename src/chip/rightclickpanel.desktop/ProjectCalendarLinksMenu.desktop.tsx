import { type CSSProperties, type RefObject } from "react";
import { RightClickPanelSurface } from "./rightClickPanelCommon";
import { RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT, RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE, resolveRightClickPanelTextWidth, type RightClickPanelId } from "./rightClickPanel.utils";

export type ProjectCalendarLinksMenuAction = {
  id: string;
  label: string;
  disabled?: boolean;
  onSelect: () => void;
};

type ProjectCalendarLinksMenuProps = {
  x: number;
  y: number;
  actions: ProjectCalendarLinksMenuAction[];
  menuRef: RefObject<HTMLDivElement | null>;
  noDragStyle: CSSProperties;
  panelId?: RightClickPanelId;
};

export const PROJECT_CALENDAR_LINKS_MENU_PANEL_ID = "project-calendar-links-context-menu";

const PROJECT_CALENDAR_LINKS_MENU_LABELS = [
  "Googleカレンダーとして追加",
  "既存Googleカレンダーにリンク",
  "Google再連携が必要です",
  "Googleアカウントがありません",
  "Google連携を解除",
  "Apple連携を解除",
  "iCloud連携を解除",
];

export const PROJECT_CALENDAR_LINKS_MENU_WIDTH = resolveRightClickPanelTextWidth(PROJECT_CALENDAR_LINKS_MENU_LABELS);

export const getProjectCalendarLinksMenuHeight = (actionCount: number): number => Math.max(RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT, actionCount * RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT + RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE);

const ProjectCalendarLinksMenu = ({
  x,
  y,
  actions,
  menuRef,
  noDragStyle,
  panelId = PROJECT_CALENDAR_LINKS_MENU_PANEL_ID,
}: ProjectCalendarLinksMenuProps) => {
  return (
    <RightClickPanelSurface
      x={x}
      y={y}
      width={PROJECT_CALENDAR_LINKS_MENU_WIDTH}
      panelRef={menuRef}
      noDragStyle={noDragStyle}
      ariaLabel="project calendar links context menu"
      panelId={panelId}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled={action.disabled}
          className="right-click-panel-item"
          role="menuitem"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

            if (action.disabled) return;

            action.onSelect();
          }}
        >
          {action.label}
        </button>
      ))}
    </RightClickPanelSurface>
  );
};

export { ProjectCalendarLinksMenu };
