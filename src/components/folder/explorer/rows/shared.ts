export const EXPLORER_ROW_BASE_CLASS_NAME =
  "sidebar-row group box-border py-0 relative w-full text-left";

export const getExplorerRowStyle = (depth: number) => ({
  paddingLeft: `calc(4px + ${depth} * var(--tree-indent-px))`,
  height: "var(--row-height-normal)",
  minHeight: "var(--row-height-normal)",
  lineHeight: "var(--row-height-normal)",
  boxSizing: "border-box" as const,
});




