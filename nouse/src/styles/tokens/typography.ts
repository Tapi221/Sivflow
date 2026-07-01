import { designTokens } from "@/presentation/design-tokens";

const UI_TYPO = "font-sans";
const CONTENT_TYPO = "font-serif";
const NUMERIC_TYPO = "tabular-nums";
const TYPOGRAPHY_FONT_SIZE_PX = designTokens.typography.fontSize;
const TYPOGRAPHY_LINE_HEIGHT = designTokens.typography.lineHeight;
const TYPOGRAPHY_TEXT_SIZE_CLASS = { xs: "text-[var(--ds-typography-font-size-xs)]", sm: "text-[var(--ds-typography-font-size-sm)]", smPlus: "text-[var(--ds-typography-font-size-sm-plus)]", md: "text-[var(--ds-typography-font-size-md)]", mdPlus: "text-[var(--ds-typography-font-size-md-plus)]", lg: "text-[var(--ds-typography-font-size-lg)]", "2xl": "text-[var(--ds-typography-font-size-2xl)]" } as const;
const TYPOGRAPHY_LINE_HEIGHT_CLASS = { tight: "leading-[var(--ds-typography-line-height-tight)]", body: "leading-[var(--ds-typography-line-height-body)]", comfortable: "leading-[var(--ds-typography-line-height-comfortable)]" } as const;
// プロダクト全体のタイポグラフィは、完成済みのカレンダー月表示を基準にします。
// アプリ UI はコンパクトに保ちます。12px を既定、11px をメタ情報、13px を表やセクション構造に使います。
const TYPO = { screenTitle: "text-base font-semibold tracking-tight", sectionTitle: "text-xs font-semibold tracking-tight", tableHeader: "text-xs font-medium leading-none tracking-normal", tableRow: `text-xs font-medium ${TYPOGRAPHY_LINE_HEIGHT_CLASS.body}`, control: "text-xs font-semibold leading-none tracking-tight", smallBody: "text-xs font-medium", meta: "text-xs font-medium leading-5", metaCompact: "text-xs font-medium leading-none", caption: "text-xs font-semibold tracking-wide", micro: "text-xs font-semibold tabular-nums", emptyTitle: "text-3xl font-semibold tracking-tight", emptyBody: `${TYPOGRAPHY_TEXT_SIZE_CLASS.sm} leading-7` } as const;
// Task board と task list は意図的に同じ token を共有し、同じ画面部品として見えるようにします。
const TASK_TYPO = { columnTitle: `${TYPO.tableHeader} text-[#3f4652]`, count: `${TYPO.micro} text-slate-500`, listHeader: `${TYPO.tableHeader} text-[#3f4652]`, listRow: TYPO.tableRow, listTitle: "font-medium leading-none tracking-normal text-zinc-900", listTitleInput: `${TYPO.tableRow} tracking-normal text-zinc-900`, detailAction: `text-xs font-medium ${TYPOGRAPHY_LINE_HEIGHT_CLASS.body} text-[#6b7280]`, cardTitle: "text-xs font-medium leading-none tracking-normal text-zinc-900", metaCluster: `${TYPO.metaCompact} text-[#4c5361]`, metaChip: `${TYPO.metaCompact} text-zinc-500`, metaPill: "text-xs font-semibold leading-none" } as const;

export { UI_TYPO, CONTENT_TYPO, NUMERIC_TYPO, TYPOGRAPHY_FONT_SIZE_PX, TYPOGRAPHY_LINE_HEIGHT, TYPOGRAPHY_TEXT_SIZE_CLASS, TYPOGRAPHY_LINE_HEIGHT_CLASS, TYPO, TASK_TYPO };
