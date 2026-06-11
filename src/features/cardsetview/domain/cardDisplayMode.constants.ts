import type { CardDisplayMode } from "@/types/domain/cardSet";



const DISPLAY_MODE_LABELS: Record<CardDisplayMode, string> = {
  fixed: "カード表示（手書き対応）",
  fluid: "最大表示(手書き不可)",
};
const DISPLAY_MODE_TRIGGER_LABELS: Record<CardDisplayMode, string> = {
  fixed: "カード表示",
  fluid: "最大表示",
};



export { DISPLAY_MODE_LABELS, DISPLAY_MODE_TRIGGER_LABELS };
