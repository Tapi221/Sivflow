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

export function PageHeader() {
  const { pathname } = useLocation();

  const crumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);

    const crumbs: Crumb[] = [{ label: "ホーム", to: "/folders" }];

    segments.forEach((seg, i) => {
      const label = PAGE_LABELS[seg.toLowerCase()] ?? seg;
      const to = "/" + segments.slice(0, i + 1).join("/");
      crumbs.push({ label, to });
    });

    if (crumbs.length > 1) {
      const last = crumbs[crumbs.length - 1];
      crumbs[crumbs.length - 1] = { label: last.label };
    }

    return crumbs;
  }, [pathname]);

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
