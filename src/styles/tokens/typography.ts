import { designTokens } from "@/presentation/design-tokens";

const UI_TYPO = "font-sans";
const CONTENT_TYPO = "font-serif";
const NUMERIC_TYPO = "tabular-nums";
const TYPOGRAPHY_FONT_SIZE_PX = designTokens.typography.fontSize;
const TYPOGRAPHY_LINE_HEIGHT = designTokens.typography.lineHeight;
const TYPOGRAPHY_TEXT_SIZE_CLASS = { xs: "text-[var(--ds-typography-font-size-xs)]", sm: "text-[var(--ds-typography-font-size-sm)]", smPlus: "text-[var(--ds-typography-font-size-sm-plus)]", md: "text-[var(--ds-typography-font-size-md)]", mdPlus: "text-[var(--ds-typography-font-size-md-plus)]", lg: "text-[var(--ds-typography-font-size-lg)]", "2xl": "text-[var(--ds-typography-font-size-2xl)]" } as const;
const TYPOGRAPHY_LINE_HEIGHT_CLASS = { tight: "leading-[var(--ds-typography-line-height-tight)]", body: "leading-[var(--ds-typography-line-height-body)]", comfortable: "leading-[var(--ds-typography-line-height-comfortable)]" } as const;
// Product chrome typography is anchored to the completed calendar month view.
// Keep app UI compact: 12px is the default, 11px is metadata, 13px is table/section structure.
const TYPO = { screenTitle: "text-[17px] font-semibold tracking-[-0.01em]", sectionTitle: "text-[13px] font-semibold tracking-[-0.01em]", tableHeader: "text-[13px] font-medium leading-none tracking-[-0.005em]", tableRow: `text-[12px] font-medium ${TYPOGRAPHY_LINE_HEIGHT_CLASS.body}`, control: "text-[12px] font-semibold leading-none tracking-[-0.01em]", smallBody: "text-[12px] font-medium", meta: "text-[11px] font-medium leading-[1.3]", metaCompact: "text-[11px] font-medium leading-none", caption: "text-[11px] font-semibold tracking-[0.03em]", micro: "text-[10px] font-semibold tabular-nums", emptyTitle: "text-[30px] font-semibold tracking-[-0.03em]", emptyBody: `${TYPOGRAPHY_TEXT_SIZE_CLASS.sm} leading-7` } as const;
// Task board and task list intentionally share these tokens so both views feel like one surface.
const TASK_TYPO = { columnTitle: `${TYPO.tableHeader} text-[#3f4652]`, count: `${TYPO.micro} text-[#8f929c]`, listHeader: `${TYPO.tableHeader} text-[#3f4652]`, listRow: TYPO.tableRow, listTitle: "font-medium leading-[18px] tracking-[-0.005em] text-[#1c1c1e]", listTitleInput: `${TYPO.tableRow} tracking-[-0.005em] text-[#1c1c1e]`, detailAction: `text-[12px] font-medium ${TYPOGRAPHY_LINE_HEIGHT_CLASS.body} text-[#6b7280]`, cardTitle: "text-[12px] font-medium leading-none tracking-[-0.005em] text-[#1c1c1e]", metaCluster: `${TYPO.metaCompact} text-[#4c5361]`, metaChip: `${TYPO.metaCompact} text-[#8e8e93]`, metaPill: "text-[11px] font-semibold leading-none" } as const;

export { UI_TYPO, CONTENT_TYPO, NUMERIC_TYPO, TYPOGRAPHY_FONT_SIZE_PX, TYPOGRAPHY_LINE_HEIGHT, TYPOGRAPHY_TEXT_SIZE_CLASS, TYPOGRAPHY_LINE_HEIGHT_CLASS, TYPO, TASK_TYPO };
