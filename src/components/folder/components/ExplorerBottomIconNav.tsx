import React from "react";
import { useLocation } from "react-router-dom";

import {
  ExplorerDictionaryNavIcon,
  ExplorerFolderNavIcon,
  ExplorerQuestionNavIcon,
  ExplorerTagMapNavIcon,
} from "@/components/explorer/ExplorerNavIcons";
import { OverlayToolbar } from "@/components/overlay-toolbar/OverlayToolbar";
import { OverlayToolbarDivider } from "@/components/overlay-toolbar/OverlayToolbarDivider";
import { OverlayToolbarNavLink } from "@/components/overlay-toolbar/OverlayToolbarNavLink";

type BottomNavItem = {
  to: string;
  label: string;
  matcher: RegExp;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const NAV_ITEMS: BottomNavItem[] = [
  {
    to: "/folders",
    label: "フォルダ",
    matcher: /^\/folders(?:\/|$)/i,
    Icon: ExplorerFolderNavIcon,
  },
  {
    to: "/tag-map",
    label: "タグ",
    matcher: /^\/tag-map(?:\/|$)/i,
    Icon: ExplorerTagMapNavIcon,
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

export const ExplorerBottomIconNav = () => {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="サイドバー下部ナビゲーション"
      className="flex items-center justify-center"
    >
      <OverlayToolbar className="gap-1 px-1.5 py-1">
        {NAV_ITEMS.map(({ to, label, matcher, Icon }, index) => {
          const isActive = matcher.test(pathname);

          return (
            <React.Fragment key={to}>
              <OverlayToolbarNavLink to={to} label={label} active={isActive}>
                <Icon className="h-3.5 w-3.5" />
              </OverlayToolbarNavLink>

              {index < NAV_ITEMS.length - 1 ? <OverlayToolbarDivider /> : null}
            </React.Fragment>
          );
        })}
      </OverlayToolbar>
    </nav>
  );
};
