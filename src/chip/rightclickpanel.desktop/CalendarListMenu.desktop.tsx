import { type CSSProperties, type RefObject } from "react";
import { RightClickPanelSurface } from "./rightClickPanelCommon";
import { RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT, RIGHT_CLICK_PANEL_MARGIN, RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE, resolveRightClickPanelTextWidth, type RightClickPanelId } from "./rightClickPanel.utils";

export type CalendarListMenuAction = {
  id: "add-project" | "change-color";
  label: string;
  disabled?: boolean;
  onSelect: () => void;
};

type CalendarListMenuProps = {
  x: number;
  y: number;
  actions: CalendarListMenuAction[];
  menuRef: RefObject<HTMLDivElement | null>;
  noDragStyle: CSSProperties;
  panelId?: RightClickPanelId;
};

export const CALENDAR_LIST_MENU_PANEL_ID = "calendar-list-context-menu";

const CALENDAR_LIST_MENU_LABELS = [
  "プロジェクトに追加",
  "色を変更",
];

export const CALENDAR_LIST_MENU_WIDTH = resolveRightClickPanelTextWidth(CALENDAR_LIST_MENU_LABELS);
export const CALENDAR_LIST_MENU_HEIGHT = CALENDAR_LIST_MENU_LABELS.length * RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT + RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE;
export const CALENDAR_LIST_MENU_MARGIN = RIGHT_CLICK_PANEL_MARGIN;

export const CalendarListMenu = ({
  x,
  y,
  actions,
  menuRef,
  noDragStyle,
  panelId = CALENDAR_LIST_MENU_PANEL_ID,
}: CalendarListMenuProps) => {
  return (
    <RightClickPanelSurface
      x={x}
      y={y}
      width={CALENDAR_LIST_MENU_WIDTH}
      panelRef={menuRef}
      noDragStyle={noDragStyle}
      ariaLabel="calendar list context menu"
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