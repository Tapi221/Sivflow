export const UI_TYPO = "font-sans";
export const CONTENT_TYPO = "font-serif";
export const NUMERIC_TYPO = "tabular-nums";

// Product chrome typography is anchored to the completed calendar month view.
// Keep app UI compact: 12px is the default, 11px is metadata, 13px is table/section structure.
export const TYPO = {
  screenTitle: "text-[17px] font-semibold tracking-[-0.01em]",
  sectionTitle: "text-[13px] font-semibold tracking-[-0.01em]",
  tableHeader: "text-[13px] font-medium leading-none tracking-[-0.005em]",
  tableRow: "text-[12px] font-medium leading-[18px]",
  control: "text-[12px] font-semibold leading-none tracking-[-0.01em]",
  smallBody: "text-[12px] font-medium",
  meta: "text-[11px] font-medium leading-[1.3]",
  metaCompact: "text-[11px] font-medium leading-none",
  caption: "text-[11px] font-semibold tracking-[0.03em]",
  micro: "text-[10px] font-semibold tabular-nums",
  emptyTitle: "text-[30px] font-semibold tracking-[-0.03em]",
  emptyBody: "text-[14px] leading-7",
} as const;

// Task board and task list intentionally share these tokens so both views feel like one surface.
export const TASK_TYPO = {
  columnTitle: `${TYPO.tableHeader} text-[#3f4652]`,
  count: `${TYPO.micro} text-[#8f929c]`,
  listHeader: `${TYPO.tableHeader} text-[#3f4652]`,
  listRow: TYPO.tableRow,
  listTitle: "font-medium leading-[18px] tracking-[-0.005em] text-[#1c1c1e]",
  listTitleInput: `${TYPO.tableRow} tracking-[-0.005em] text-[#1c1c1e]`,
  detailAction: "text-[12px] font-medium leading-[18px] text-[#6b7280]",
  cardTitle: "text-[12px] font-medium leading-none tracking-[-0.005em] text-[#1c1c1e]",
  metaCluster: `${TYPO.metaCompact} text-[#4c5361]`,
  metaChip: `${TYPO.metaCompact} text-[#8e8e93]`,
  metaPill: "text-[11px] font-semibold leading-none",
} as const;
