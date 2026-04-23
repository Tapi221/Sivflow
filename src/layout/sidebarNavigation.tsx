import React from "react";
import {
  ExplorerDictionaryNavIcon,
  ExplorerFolderNavIcon,
  ExplorerQuestionNavIcon,
  ExplorerTagMapNavIcon,
} from "@/components/explorer/ExplorerNavIcons";

export type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

const CALENDAR_ICON = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="1.5"
      y="3"
      width="13"
      height="11.5"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <path d="M1.5 6.5H14.5" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M5 1.5V4.5M11 1.5V4.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

const GALLERY_ICON = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="1.5"
      y="1.5"
      width="5.5"
      height="5.5"
      rx="0.75"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <rect
      x="9"
      y="1.5"
      width="5.5"
      height="5.5"
      rx="0.75"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <rect
      x="1.5"
      y="9"
      width="5.5"
      height="5.5"
      rx="0.75"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <rect
      x="9"
      y="9"
      width="5.5"
      height="5.5"
      rx="0.75"
      stroke="currentColor"
      strokeWidth="1.2"
    />
  </svg>
);

const DIRECTORY_ICON = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M2 3.5H6M2 8H10M2 12.5H14"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <circle cx="8" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="12" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

const TRASH_ICON = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M2.5 4.5H13.5L12.5 13.5H3.5L2.5 4.5Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M1 4.5H15M6 4.5V2.5H10V4.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    to: "/folders",
    label: "フォルダ",
    icon: <ExplorerFolderNavIcon className="h-4 w-4" />,
  },
  {
    to: "/dictionary",
    label: "辞書",
    icon: <ExplorerDictionaryNavIcon className="h-4 w-4" />,
  },
  {
    to: "/questions",
    label: "疑問集",
    icon: <ExplorerQuestionNavIcon className="h-4 w-4" />,
  },
  { to: "/calendar", label: "カレンダー", icon: CALENDAR_ICON },
];

export const SECONDARY_NAV_ITEMS: NavItem[] = [
  {
    to: "/tag-map",
    label: "タグマップ",
    icon: <ExplorerTagMapNavIcon className="h-4 w-4" />,
  },
  { to: "/gallery", label: "ギャラリー", icon: GALLERY_ICON },
  { to: "/directory", label: "ディレクトリ", icon: DIRECTORY_ICON },
  { to: "/trash", label: "ゴミ箱", icon: TRASH_ICON },
];

export const NAV_SECTIONS: NavSection[] = [
  { title: "メイン", items: PRIMARY_NAV_ITEMS },
  { title: "整理", items: SECONDARY_NAV_ITEMS },
];
