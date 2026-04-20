// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import {
  BreadcrumbProvider,
  useSetBreadcrumbCrumbs,
} from "@/contexts/BreadcrumbContext";
import type { BreadcrumbCrumb } from "@/features/breadcrumbs/types";
import { TitleBar } from "@/layout/TitleBar";

vi.mock("@/hooks/platform/useHasDesktopBridge", () => ({
  useHasDesktopBridge: () => false,
}));

vi.mock("@/platform/presentation/usePresentationTarget", () => ({
  usePresentationTarget: () => "desktop",
}));

vi.mock(
  "@/features/cardsetview/presentation/web/events/cardSetViewWindowEvents",
  () => ({
    dispatchCardSetViewWindowEvent: vi.fn(),
    subscribeCardSetViewWindowEvent: () => () => {},
  }),
);

vi.mock("@/platform/capabilities/windowControls", () => ({
  windowControls: {
    minimize: async () => {},
    maximizeToggle: async () => {},
    close: async () => {},
    isMaximized: async () => false,
    onMaximizedStateChange: () => () => {},
  },
}));

type BreadcrumbInitializerProps = {
  crumbs: BreadcrumbCrumb[];
};

const BreadcrumbInitializer = ({ crumbs }: BreadcrumbInitializerProps) => {
  const setExtraCrumbs = useSetBreadcrumbCrumbs();

  useLayoutEffect(() => {
    setExtraCrumbs(crumbs);
  }, [crumbs, setExtraCrumbs]);

  return null;
};

type RenderTitleBarOptions = {
  path: string;
  crumbs?: BreadcrumbCrumb[];
};

const renderTitleBar = ({
  path,
  crumbs = [],
}: RenderTitleBarOptions): void => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <BreadcrumbProvider>
        <BreadcrumbInitializer crumbs={crumbs} />
        <TitleBar />
      </BreadcrumbProvider>
    </MemoryRouter>,
  );
};

describe("TitleBar breadcrumbs", () => {
  it("現在地のパンくずにもクリック可能なパンくずと同じメトリクスクラスを付与する", () => {
    renderTitleBar({ path: "/folders" });

    const currentCrumb = screen.getByText("フォルダ一覧");

    expect(currentCrumb.tagName).toBe("SPAN");
    expect(currentCrumb.className).toContain("titlebar-breadcrumb-item");
    expect(currentCrumb.className).toContain("titlebar-breadcrumb-current");
    expect(currentCrumb.getAttribute("aria-current")).toBe("page");
  });

  it("階層が深くなってもフォルダ一覧パンくずは同じメトリクスクラスを維持する", () => {
    renderTitleBar({
      path: "/folders",
      crumbs: [{ label: "新規フォルダ", to: undefined, folderId: "folder-1" }],
    });

    const folderListCrumb = screen.getByRole("button", {
      name: "フォルダ一覧",
    });
    const currentCrumb = screen.getByText("新規フォルダ");

    expect(folderListCrumb.className).toContain("titlebar-breadcrumb-item");
    expect(folderListCrumb.className).toContain("titlebar-breadcrumb-link");
    expect(currentCrumb.className).toContain("titlebar-breadcrumb-item");
    expect(currentCrumb.className).toContain("titlebar-breadcrumb-current");
  });
});
