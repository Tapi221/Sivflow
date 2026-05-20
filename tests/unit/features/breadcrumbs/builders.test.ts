import { describe, expect, it } from "vitest";

import { mergeTitleBarBreadcrumbs } from "@/features/breadcrumbs/builders";
import type { BreadcrumbCrumb } from "@/features/breadcrumbs/types";

describe("mergeTitleBarBreadcrumbs", () => {
  it("cardSetView のフォルダ一覧パンくずは現在フォルダに戻る", () => {
    const baseCrumbs: BreadcrumbCrumb[] = [
      { label: "ホーム", to: "/folders?home=1" },
      { label: "カード閲覧", to: undefined },
    ];
    const extraCrumbs: BreadcrumbCrumb[] = [
      {
        label: "React",
        to: "/folders?folderId=folder-react",
        folderId: "folder-react",
      },
      {
        label: "Hooks",
        to: "/folders?folderId=folder-hooks",
        folderId: "folder-hooks",
      },
      {
        label: "useEffect 集",
        to: "/folders?folderId=folder-hooks&cardSetId=set-1",
        folderId: "folder-hooks",
      },
      { label: "1/10 : cleanup", to: undefined },
    ];

    const merged = mergeTitleBarBreadcrumbs({
      pathname: "/CardSetView",
      baseCrumbs,
      extraCrumbs,
    });

    expect(merged[1]).toEqual({
      label: "フォルダ一覧",
      to: "/folders?folderId=folder-hooks",
    });
  });

  it("folders 画面でもフォルダ一覧パンくずは現在フォルダに戻る", () => {
    const baseCrumbs: BreadcrumbCrumb[] = [
      { label: "ホーム", to: "/folders?home=1" },
      { label: "フォルダ一覧", to: undefined },
    ];
    const extraCrumbs: BreadcrumbCrumb[] = [
      {
        label: "React",
        to: "/folders?folderId=folder-react",
        folderId: "folder-react",
      },
      {
        label: "Hooks",
        to: "/folders?folderId=folder-hooks",
        folderId: "folder-hooks",
      },
      { label: "useEffect 集", to: undefined },
    ];

    const merged = mergeTitleBarBreadcrumbs({
      pathname: "/folders",
      baseCrumbs,
      extraCrumbs,
    });

    expect(merged[1]).toEqual({
      label: "フォルダ一覧",
      to: "/folders?folderId=folder-hooks",
    });
  });

  it("current folder を解決できないときだけ section-list にフォールバックする", () => {
    const baseCrumbs: BreadcrumbCrumb[] = [
      { label: "ホーム", to: "/folders?home=1" },
      { label: "カード閲覧", to: undefined },
    ];
    const extraCrumbs: BreadcrumbCrumb[] = [
      { label: "カードセット", to: undefined },
    ];

    const merged = mergeTitleBarBreadcrumbs({
      pathname: "/cardsetview",
      baseCrumbs,
      extraCrumbs,
    });

    expect(merged[1]).toEqual({
      label: "フォルダ一覧",
      to: "/folders?view=section-list&libraryType=pdf",
    });
  });
});
