import { cn } from "@/lib/utils";
import React from "react";
import { NavLink, useLocation } from "react-router-dom";

type BottomNavItem = {
  to: string;
  label: string;
  matcher: RegExp;
  icon: React.ReactNode;
};

const FolderIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M1.5 3.5A1 1 0 0 1 2.5 2.5H6l1.5 1.5H13.5A1 1 0 0 1 14.5 5V12.5A1 1 0 0 1 13.5 13.5H2.5A1 1 0 0 1 1.5 12.5V3.5Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

const TagMapIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M4.25 4.25H8M8 4.25L11.75 2.75M8 4.25L11.75 7.25M4.25 4.25V11.75"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="4.25"
      cy="4.25"
      r="1.75"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <circle
      cx="11.75"
      cy="2.75"
      r="1.75"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <circle
      cx="11.75"
      cy="7.25"
      r="1.75"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <circle
      cx="4.25"
      cy="11.75"
      r="1.75"
      stroke="currentColor"
      strokeWidth="1.2"
    />
  </svg>
);

const DictionaryIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M3 2.5H11.5A1.5 1.5 0 0 1 13 4V13.5H4.5A1.5 1.5 0 0 0 3 15V2.5Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M4.5 15V4A1.5 1.5 0 0 1 6 2.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M6.5 5.5H10.5M6.5 8H10.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

const QuestionIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M8 11.5V10.8C8 9.9 8.45 9.45 9.05 9.05C9.7 8.62 10.5 8.05 10.5 6.95C10.5 5.43 9.28 4.25 7.75 4.25C6.38 4.25 5.25 5.18 5.02 6.45"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="8" cy="13" r="0.7" fill="currentColor" />
    <path
      d="M8 1.5C4.41 1.5 1.5 4.41 1.5 8C1.5 11.59 4.41 14.5 8 14.5C11.59 14.5 14.5 11.59 14.5 8C14.5 4.41 11.59 1.5 8 1.5Z"
      stroke="currentColor"
      strokeWidth="1.2"
    />
  </svg>
);

const NAV_ITEMS: BottomNavItem[] = [
  {
    to: "/folders",
    label: "フォルダ",
    matcher: /^\/folders(?:\/|$)/i,
    icon: <FolderIcon />,
  },
  {
    to: "/tag-map",
    label: "タグ",
    matcher: /^\/tag-map(?:\/|$)/i,
    icon: <TagMapIcon />,
  },
  {
    to: "/dictionary",
    label: "辞書",
    matcher: /^\/dictionary(?:\/|$)/i,
    icon: <DictionaryIcon />,
  },
  {
    to: "/questions",
    label: "疑問集",
    matcher: /^\/questions(?:\/|$)/i,
    icon: <QuestionIcon />,
  },
];

export const ExplorerBottomIconNav = () => {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="サイドバー下部ナビゲーション"
      className="grid grid-cols-4 gap-1"
    >
      {NAV_ITEMS.map(({ to, label, matcher, icon }) => {
        const isActive = matcher.test(pathname);

        return (
          <NavLink
            key={to}
            to={to}
            title={label}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-10 items-center justify-center rounded-xl border border-transparent transition-colors",
              isActive
                ? "bg-[rgba(55,53,47,0.08)] text-[var(--sidebar-text,#37352f)]"
                : "text-[var(--sidebar-text-muted,rgba(55,53,47,0.72))] hover:bg-[rgba(55,53,47,0.05)] hover:text-[var(--sidebar-text,#37352f)]",
            )}
          >
            {icon}
          </NavLink>
        );
      })}
    </nav>
  );
};
