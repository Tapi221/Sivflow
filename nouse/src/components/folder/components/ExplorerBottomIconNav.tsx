import React from "react";
import { cn } from "@web-renderer/lib/utils";
import { NavLink, useLocation } from "react-router-dom";
import { ExplorerDictionaryNavIcon, ExplorerFolderNavIcon, ExplorerQuestionNavIcon } from "@/components/explorer/ExplorerNavIcons";



type BottomNavItem = {
  to: string;
  label: string;
  matcher: RegExp;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};



const NAV_ITEMS: BottomNavItem[] = [
  {
    to: "/library",
    label: "ライブラリ",
    matcher: /^\/library(?:\/|$)/i,
    Icon: ExplorerFolderNavIcon,
  },
  {
    to: "/dictionary",
    label: "辞書",
    matcher: /^\/dictionary(?:\/|$)/i,
    Icon: ExplorerDictionaryNavIcon,
  },
  {
    to: "/questions",
    label: "疑問集",
    matcher: /^\/questions(?:\/|$)/i,
    Icon: ExplorerQuestionNavIcon,
  },
];



const ExplorerBottomIconNav = () => {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="サイドバー下部ナビゲーション"
      className="flex items-center justify-center"
    >
      <div className="inline-flex items-center rounded-full border border-[rgba(229,231,235,1)] bg-[rgba(255,255,255,0.82)] px-1 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.025)] backdrop-blur-[8px]">
        {NAV_ITEMS.map(({ to, label, matcher, Icon }, index) => {
          const isActive = matcher.test(pathname);

          return (
            <React.Fragment key={to}>
              <NavLink
                to={to}
                title={label}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-8 w-8 items-center justify-center rounded-full text-[rgba(107,114,128,0.88)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(107,95,85,0.18)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                  isActive
                    ? "bg-[#f3f4f6] text-[#111827]"
                    : "hover:bg-[#f9fafb] hover:text-[#4b5563]",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </NavLink>

              {index < NAV_ITEMS.length - 1 ? (
                <span className="mx-0.5 h-4 w-px bg-[rgba(229,231,235,1)]" />
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};



export { ExplorerBottomIconNav };
