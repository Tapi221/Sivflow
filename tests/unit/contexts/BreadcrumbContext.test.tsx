// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  BreadcrumbProvider,
  useBreadcrumbExtraCrumbs,
  useSetBreadcrumbCrumbs,
} from "@/contexts/BreadcrumbContext";
import type { BreadcrumbCrumb } from "@/features/breadcrumbs/types";

const nextCrumbs: BreadcrumbCrumb[] = [{ label: "フォルダ一覧" }];

let setterRenderCount = 0;
let readerRenderCount = 0;

const SetterOnlyConsumer = () => {
  setterRenderCount += 1;
  const setExtraCrumbs = useSetBreadcrumbCrumbs();

  return (
    <button type="button" onClick={() => setExtraCrumbs(nextCrumbs)}>
      update
    </button>
  );
};

const ReaderConsumer = () => {
  readerRenderCount += 1;
  const extraCrumbs = useBreadcrumbExtraCrumbs();

  return <div>{extraCrumbs.map(({ label }) => label).join(" / ") || "empty"}</div>;
};

describe("BreadcrumbContext", () => {
  it("setter 専用 consumer は extraCrumbs 更新で再レンダリングされない", async () => {
    const user = userEvent.setup();

    setterRenderCount = 0;
    readerRenderCount = 0;

    render(
      <BreadcrumbProvider>
        <SetterOnlyConsumer />
        <ReaderConsumer />
      </BreadcrumbProvider>,
    );

    expect(screen.getByText("empty")).toBeTruthy();
    expect(setterRenderCount).toBe(1);
    expect(readerRenderCount).toBe(1);

    await user.click(screen.getByRole("button", { name: "update" }));

    expect(screen.getByText("フォルダ一覧")).toBeTruthy();
    expect(setterRenderCount).toBe(1);
    expect(readerRenderCount).toBe(2);
  });
});
