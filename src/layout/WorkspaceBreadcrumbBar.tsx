/**
 * WorkspaceBreadcrumbBar.tsx
 *
 * 責務：パンくずバーの「描画のみ」。
 * ロジックはすべて useBreadcrumbs() に委譲している。
 *
 * hideCrumbs=true のとき：
 *   - action があれば右端に表示しつつ高さを確保
 *   - action もなければ高さゼロで collapse
 */

import { Fragment } from "react";

import type { BreadcrumbCrumb } from "@/features/breadcrumbs/breadcrumbs.types";
import { useBreadcrumbs } from "@/features/breadcrumbs/useBreadcrumbs";

import { cn } from "@/lib/utils";

export const WorkspaceBreadcrumbBar = ({
  hideCrumbs = false,
}: {
  hideCrumbs?: boolean;
}) => {
  const {
    crumbs,
    shouldHideBreadcrumb,
    hasNoActiveTab,
    action,
    handleCrumbNavigate,
  } = useBreadcrumbs();

  // アクティブタブなし → 空バー（グリッド行の構造だけ維持）
  if (hasNoActiveTab) {
    return <nav className="workspace-breadcrumb-bar" aria-label="Breadcrumb" />;
  }

  // パンくず非表示セクション（calendar, tasks, document）かつ action もなし → 高さゼロ
  if (shouldHideBreadcrumb && !action) {
    return (
      <nav
        className="workspace-breadcrumb-bar workspace-breadcrumb-bar--collapsed"
        aria-label="Breadcrumb"
      />
    );
  }

  // hideCrumbs=true（WorkspaceShell 側の指定）かつ action もなし → 高さゼロ
  if (hideCrumbs && !action) {
    return (
      <nav
        className="workspace-breadcrumb-bar workspace-breadcrumb-bar--collapsed"
        aria-label="Breadcrumb"
      />
    );
  }

  // パンくず非表示セクションだが hideCrumbs=false → 空バー（高さは確保）
  if (!hideCrumbs && shouldHideBreadcrumb) {
    return <nav className="workspace-breadcrumb-bar" aria-label="Breadcrumb" />;
  }

  // パンくずなし → 空バー
  if (!hideCrumbs && crumbs.length === 0) {
    return <nav className="workspace-breadcrumb-bar" aria-label="Breadcrumb" />;
  }

  // ── 通常描画 ──
  return (
    <nav className="workspace-breadcrumb-bar" aria-label="Breadcrumb">
      {hideCrumbs ? null : (
        <ol className="workspace-breadcrumb-bar__list">
          {crumbs.map((crumb: BreadcrumbCrumb, index: number) => {
            const isLast = index === crumbs.length - 1;
            const target = isLast ? undefined : crumb.to;

            return (
              <Fragment key={`${crumb.label}:${crumb.to ?? ""}:${index}`}>
                {index > 0 ? (
                  <li
                    className="workspace-breadcrumb-bar__separator"
                    aria-hidden
                  >
                    /
                  </li>
                ) : null}
                <li className="workspace-breadcrumb-bar__item">
                  {target ? (
                    <button
                      type="button"
                      className="workspace-breadcrumb-bar__button"
                      title={crumb.label}
                      onClick={() => handleCrumbNavigate(target)}
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
      )}
      {action ? (
        <div className="workspace-breadcrumb-bar__action">{action}</div>
      ) : null}
    </nav>
  );
};
