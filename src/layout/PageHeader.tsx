import React, { useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import "./PageHeader.css";

type Crumb = { label: string; to?: string };

const PAGE_LABELS: Record<string, string> = {
  folders: "フォルダ",
  calendar: "カレンダー",
  gallery: "ギャラリー",
  trash: "ゴミ箱",
  study: "学習モード",
  cardedit: "カード編集",
  cardview: "カード閲覧",
  "one-qa-mode": "一問一答",
  "pair-mode": "ペアモード",
  "four-choice-mode": "四択モード",
};

function useBreadcrumbs(): { crumbs: Crumb[]; title: string } {
  const { pathname } = useLocation();

  return useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const crumbs: Crumb[] = [{ label: "ホーム", to: "/folders" }];

    segments.forEach((seg, i) => {
      const label = PAGE_LABELS[seg.toLowerCase()] ?? seg;
      const to = "/" + segments.slice(0, i + 1).join("/");
      crumbs.push({ label, to });
    });

    const last = crumbs[crumbs.length - 1];

    // Remove `to` from last crumb — it's the current page
    if (crumbs.length > 1) {
      crumbs[crumbs.length - 1] = { label: last.label };
    }

    return { crumbs, title };
  }, [pathname]);
}

export function PageHeader() {

  return (
    <header className="page-header">
      <nav className="page-header__breadcrumb" aria-label="パンくずリスト">
        {crumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="page-header__sep">/</span>}
            {crumb.to ? (
              <Link to={crumb.to} className="page-header__crumb-link">
                {crumb.label}
              </Link>
            ) : (
              <span className="page-header__crumb-current">{crumb.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>
    </header>
  );
}




