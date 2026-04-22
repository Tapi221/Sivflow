import React from "react";
import { NavLink, useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";

type KnowledgeTab = {
  to: string;
  label: string;
  matcher: RegExp;
};

const KNOWLEDGE_TABS: KnowledgeTab[] = [
  { to: "/folders", label: "フォルダ", matcher: /^\/folders(?:\/|$)/i },
  { to: "/tag-map", label: "タグ", matcher: /^\/tag-map(?:\/|$)/i },
  { to: "/dictionary", label: "辞書", matcher: /^\/dictionary(?:\/|$)/i },
  { to: "/questions", label: "疑問集", matcher: /^\/questions(?:\/|$)/i },
];

const getTabClassName = (isActive: boolean) => {
  return cn(
    "inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold transition-colors",
    isActive
      ? "bg-[rgba(55,53,47,0.08)] text-[rgba(55,53,47,0.96)]"
      : "text-[rgba(55,53,47,0.68)] hover:bg-[rgba(55,53,47,0.05)] hover:text-[rgba(55,53,47,0.92)]",
  );
};

export const KnowledgeModeTabs = () => {
  const { pathname } = useLocation();

  return (
    <div className="border-b border-[rgba(55,53,47,0.09)] bg-[#fbfbfa] px-4 py-2">
      <nav
        aria-label="学習モード切り替え"
        className="flex min-w-0 items-center gap-1 overflow-x-auto"
      >
        {KNOWLEDGE_TABS.map(({ to, label, matcher }) => {
          const isActive = matcher.test(pathname);

          return (
            <NavLink
              key={to}
              to={to}
              className={getTabClassName(isActive)}
              aria-current={isActive ? "page" : undefined}
            >
              {label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
