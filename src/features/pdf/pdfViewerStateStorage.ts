/**
 * PDF ビューアの表示状態を sessionStorage に永続化するユーティリティ。
 * キーは docId 単位で分離しているため、複数 PDF を跨いで状態が混ざらない。
 */
import type { PdfViewerState } from "@/types";
import {
  EPSILON,
  FIT_MAX_SCALE,
  FIT_MIN_SCALE,
  FIT_PADDING_X,
  VIEWER_STATE_DEBOUNCE_MS,
  ZOOM_STEP,
} from "@/features/pdf";

export {
  EPSILON,
  FIT_MAX_SCALE,
  FIT_MIN_SCALE,
  FIT_PADDING_X,
  VIEWER_STATE_DEBOUNCE_MS,
  ZOOM_STEP,
};

// ✅ ドキュメント切替保護：呼び出し側で docId を指定する
export const getViewerStateFromSession = (
  docId: string,
): PdfViewerState | null => {
  try {
    const key = `pdf_viewer_${docId}`;
    const stored = sessionStorage.getItem(key);
    return stored ? (JSON.parse(stored) as PdfViewerState) : null;
  } catch {
    return null;
  }
};

// ✅ ドキュメント切替保護：docId パラメータで正しいキーを保証
export const saveViewerStateToSession = (
  docId: string,
  state: PdfViewerState,
): void => {
  try {
    const key = `pdf_viewer_${docId}`;
    sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    // 無視（容量超過など）
  }
};

export const clampScale = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(value, FIT_MIN_SCALE), FIT_MAX_SCALE);
};
