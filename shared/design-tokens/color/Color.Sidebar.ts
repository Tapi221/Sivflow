type SidebarColor = {
  hoverBg: string;
  activeBg: string;
  text: string;
  textStrong: string;
  textMuted: string;
  textHover: string;
  icon: string;
  iconInactive: string;
  iconActive: string;
  focusRing: string;
  sourceSwitchInactiveBorder: string;
};



const SIDEBAR_COLOR = {
  hoverBg: "rgba(0, 0, 0, 0.05)",
  activeBg: "rgba(0, 0, 0, 0.07)",
  text: "#606060",
  textStrong: "#2f2f2f",
  textMuted: "#9a9a9a",
  textHover: "#2f2f2f",
  icon: "#8a8a8a",
  iconInactive: "#b7b7b7",
  iconActive: "#8c8c8c",
  focusRing: "rgba(0, 0, 0, 0.16)",
  sourceSwitchInactiveBorder: "#d4d4d4",
} as const satisfies SidebarColor;



export { SIDEBAR_COLOR };


export type { SidebarColor };
