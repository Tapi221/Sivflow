import { Fragment, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  useBreadcrumbAction,
  useBreadcrumbExtraCrumbs,
} from "@/contexts/BreadcrumbContext";
import type { BreadcrumbCrumb } from "@/features/breadcrumbs/types";
import type { WorkspaceTab } from "@/features/workspace-tabs/domain/workspaceTab";
import { useWorkspaceTabsStore } from "@/features/workspace-tabs/store/useWorkspaceTabsStore";
import { cn } from "@/lib/utils";

const SECTION_LABELS = {
  home: "ホーム",
  review: "復習",
  library: "ライブラリ",
  calendar: "カレンダー",
} as const;

const LIBRARY_TYPE_LABELS = {
  pdf: "PDF",
  flashcards: "フラッシュカード",
  notes: "ノート",
} as const;

const resolveActiveCrumbs = ({
  activeTab,
  extraCrumbs,
  libraryType,
}: {
  activeTab: WorkspaceTab | null;
  extraCrumbs: BreadcrumbCrumb[];
  libraryType: string | null;
}): BreadcrumbCrumb[] => {
  if (!activeTab) {
    return [];
  }

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
      ? LIBRARY_TYPE_LABELS[libraryType as keyof typeof LIBRARY_TYPE_LABELS]
      : null;

  if (libraryTypeLabel) {
    return [
      baseCrumb,
      {
        label: libraryTypeLabel,
        to: undefined,
      },
    ];
  }

  if (extraCrumbs.length > 0) {
    return [baseCrumb, ...extraCrumbs];
  }

  if (
    activeTab.kind === "document" ||
    activeTab.kind === "cardSet" ||
    activeTab.kind === "card"
  ) {
    return [
      baseCrumb,
      {
        label: activeTab.title,
        to: undefined,
      },
    ];
  }

  return [{ ...baseCrumb, to: undefined }];
};

export const WorkspaceBreadcrumbBar = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const action = useBreadcrumbAction();
  const extraCrumbs = useBreadcrumbExtraCrumbs();
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [activeTabId, tabs],
  );

  const crumbs = useMemo(
    () =>
      resolveActiveCrumbs({
        activeTab,
        extraCrumbs,
        libraryType: new URLSearchParams(search).get("libraryType"),
      }),
    [activeTab, extraCrumbs, search],
  );

  if (!activeTab || crumbs.length === 0) {
    return null;
  }

  return (
    <nav className="workspace-breadcrumb-bar" aria-label="Breadcrumb">
      <ol className="workspace-breadcrumb-bar__list">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const target = isLast ? undefined : crumb.to;

          return (
            <Fragment key={`${crumb.label}:${crumb.to ?? ""}:${index}`}>
              {index > 0 ? (
                <li className="workspace-breadcrumb-bar__separator" aria-hidden>
                  /
                </li>
              ) : null}
              <li className="workspace-breadcrumb-bar__item">
                {target ? (
                  <button
                    type="button"
                    className="workspace-breadcrumb-bar__button"
                    title={crumb.label}
                    onClick={() => navigate(target)}
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span
                    className={cn(
                      "workspace-breadcrumb-bar__label",
                      isLast && "workspace-breadcrumb-bar__label--current",
                    )}
                    title={crumb.label}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
      {action ? (
        <div className="workspace-breadcrumb-bar__action">{action}</div>
      ) : null}
    </nav>
  );
};
