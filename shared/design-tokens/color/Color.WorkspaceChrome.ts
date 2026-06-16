type WorkspaceTabColor = {
  activeSurface: string;
  inactiveText: string;
  inactiveTextHover: string;
  activeIcon: string;
  closeIcon: string;
  closeIconHover: string;
  closeIconHoverBackground: string;
};



const WORKSPACE_TAB_COLOR = {
  activeSurface: "#fff",
  inactiveText: "#b7b7b7",
  inactiveTextHover: "#8c8c8c",
  activeIcon: "#8c8c8c",
  closeIcon: "#6f7681",
  closeIconHover: "#2f3640",
  closeIconHoverBackground: "rgba(0, 0, 0, 0.05)",
} as const satisfies WorkspaceTabColor;



export { WORKSPACE_TAB_COLOR };


export type { WorkspaceTabColor };
