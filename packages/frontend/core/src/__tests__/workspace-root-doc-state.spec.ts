import { describe, expect, it } from "vitest";

import { isWorkspaceRootDocRenderable } from "../modules/workspace/root-doc-state";

describe("isWorkspaceRootDocRenderable", () => {
  it("renders local workspaces after the root doc finishes loading", () => {
    expect(
      isWorkspaceRootDocRenderable({ flavour: "local" } as const, {
        loaded: true,
        ready: false,
      }),
    ).toBe(true);
  });

  it("keeps cloud workspaces blocked until root doc data is ready", () => {
    expect(
      isWorkspaceRootDocRenderable({ flavour: "affine-cloud" } as const, {
        loaded: true,
        ready: false,
      }),
    ).toBe(false);
  });

  it("always renders once the root doc has data", () => {
    expect(
      isWorkspaceRootDocRenderable({ flavour: "affine-cloud" } as const, {
        loaded: false,
        ready: true,
      }),
    ).toBe(true);
  });
});
