/**
 * useBreadcrumbs.ts
 *
 * WorkspaceBreadcrumbBar が持っていたロジックを切り出したカスタムフック。
 *
 * 責務：
 *   - アクティブタブの取得
 *   - パンくずリストの算出（resolveActiveCrumbs）
 *   - 表示抑制フラグの算出
 *   - クリック時のナビゲーション処理
 *
 * WorkspaceBreadcrumbBar.tsx は「このフックの戻り値を受け取って描画するだけ」
 * という薄いコンポーネントになる。
 */

import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import type { BreadcrumbCrumb } from "@/features/breadcrumbs/breadcrumbs.types";
import { useWorkspaceTabsStore } from "@/features/tab/hooks/useTabsStore";
import type { WorkspaceSidebarSection, WorkspaceTab } from "@/features/tab/Tab";

import {
  useBreadcrumbAction,
  useBreadcrumbExtraCrumbs,
} from "@/contexts/BreadcrumbContext";

// ─────────────────────────────────────────
// 定数（WorkspaceBreadcrumbBar から移動）
// ─────────────────────────────────────────

const SECTION_LABELS: Record<WorkspaceSidebarSection, string> = {
  home: "ホーム",
  review: "復習",
  library: "ライブラリ",
  schedule: "スケジュール",
  tasks: "タスク",
};

const LIBRARY_TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  flashcards: "フラッシュカード",
  notes: "ノート",
};

// ─────────────────────────────────────────
// 純粋関数（WorkspaceBreadcrumbBar から移動）
// ─────────────────────────────────────────

const buildLibraryTypeRoute = (libraryType: string): string => {
  const searchParams = new URLSearchParams();
  searchParams.set("view", "section-list");
  searchParams.set("libraryType", libraryType);
  return `/folders?${searchParams.toString()}`;
};

const resolveSectionKeyForTarget = (
  target: string,
): WorkspaceSidebarSection | null => {
  const [pathname = "", search = ""] = target.split("?");
  const normalizedPathname = pathname.toLowerCase();
  const searchParams = new URLSearchParams(search);

  if (normalizedPathname === "/folders") {
    return searchParams.get("home") === "1" ? "home" : "library";
  }
  if (normalizedPathname === "/gallery") return "review";
  if (normalizedPathname === "/study") return "review";
  if (normalizedPathname === "/schedule") return "schedule";
  if (normalizedPathname === "/tasks") return "tasks";

  return null;
};

const resolveActiveCrumbs = ({
  activeTab,
  extraCrumbs,
  libraryType,
}: {
  activeTab: WorkspaceTab | null;
  extraCrumbs: BreadcrumbCrumb[];
  libraryType: string | null;
}): BreadcrumbCrumb[] => {
  if (!activeTab) return [];

  const baseCrumb: BreadcrumbCrumb = {
    label: SECTION_LABELS[activeTab.sectionKey],
    to:
      activeTab.sectionKey === "library"
        ? "/folders?view=section-list"
        : undefined,
  };

  if (activeTab.sectionKey !== "library") {
    return [{ ...baseCrumb, to: undefined }];
  }

  const libraryTypeLabel =
    libraryType && libraryType in LIBRARY_TYPE_LABELS
      ? LIBRARY_TYPE_LABELS[libraryType]
      : null;

  if (libraryTypeLabel && libraryType) {
    const libraryTypeCrumb: BreadcrumbCrumb = {
      label: libraryTypeLabel,
      to: buildLibraryTypeRoute(libraryType),
    };

    if (
      activeTab.kind === "document" ||
      activeTab.kind === "cardSet" ||
      activeTab.kind === "card"
    ) {
      return [baseCrumb, libraryTypeCrumb, { label: activeTab.title }];
    }

    return [baseCrumb, { ...libraryTypeCrumb, to: undefined }];
  }

  if (extraCrumbs.length > 0) {
    return [baseCrumb, ...extraCrumbs];
  }

  if (
    activeTab.kind === "document" ||
    activeTab.kind === "cardSet" ||
    activeTab.kind === "card"
  ) {
    return [baseCrumb, { label: activeTab.title }];
  }

  return [{ ...baseCrumb, to: undefined }];
};

// ─────────────────────────────────────────
// 戻り値の型
// ─────────────────────────────────────────

export type UseBreadcrumbsReturn = {
  /** 算出済みパンくずリスト */
  crumbs: BreadcrumbCrumb[];
  /** パンくずバー全体を非表示にすべきか（高さゼロに collapse する） */
  shouldHideBreadcrumb: boolean;
  /** アクティブタブが存在しないか（空バーを描画する） */
  hasNoActiveTab: boolean;
  /** パンくずの右端に表示するアクション（省略可） */
  action: React.ReactNode;
  /** パンくずアイテムをクリックしたときのナビゲーション処理 */
  handleCrumbNavigate: (target: string) => void;
};

// ─────────────────────────────────────────
// フック本体
// ─────────────────────────────────────────

export const useBreadcrumbs = (): UseBreadcrumbsReturn => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const action = useBreadcrumbAction();
  const extraCrumbs = useBreadcrumbExtraCrumbs();

  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const openSectionTab = useWorkspaceTabsStore((state) => state.openSectionTab);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [activeTabId, tabs],
  );

  const shouldHideBreadcrumb =
    activeTab?.kind === "document" ||
    activeTab?.sectionKey === "schedule" ||
    activeTab?.sectionKey === "tasks";

  const crumbs = useMemo(
    () =>
      resolveActiveCrumbs({
        activeTab,
        extraCrumbs,
        libraryType: new URLSearchParams(search).get("libraryType"),
      }),
    [activeTab, extraCrumbs, search],
  );

  const handleCrumbNavigate = useCallback(
    (target: string) => {
      const sectionKey = resolveSectionKeyForTarget(target);
      if (sectionKey) openSectionTab(sectionKey);
      navigate(target);
    },
    [navigate, openSectionTab],
  );

  return {
    crumbs,
    shouldHideBreadcrumb: shouldHideBreadcrumb ?? false,
    hasNoActiveTab: activeTab === null,
    action,
    handleCrumbNavigate,
  };
};
