import { describe, expect, it, vi } from "vitest";

import {
  requestSectionListNavigation,
  subscribeSectionListNavigation,
} from "@/features/explorer/adapters/web/explorerSectionListNavigation";

describe("explorerSectionListNavigation", () => {
  it("dispatches section-list navigation requests to subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSectionListNavigation(listener);

    requestSectionListNavigation({
      reason: "titlebar-breadcrumb",
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      reason: "titlebar-breadcrumb",
    });

    unsubscribe();
  });

  it("does not notify unsubscribed listeners", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSectionListNavigation(listener);

    unsubscribe();
    requestSectionListNavigation({
      reason: "titlebar-breadcrumb",
    });

    expect(listener).not.toHaveBeenCalled();
  });
});
