import { describe, expect, it } from "vitest";
import { shouldDisableExplorerDrop } from "@/components/folder/components/views/explorerDropRules";

type TestNode = {
  id: string;
  data?: { kind?: "folder" | "cardSet" | "card" | "document" };
  parent?: TestNode | null;
};

const createNode = (
  id: string,
  kind?: "folder" | "cardSet" | "card" | "document",
): TestNode => ({
  id,
  data: kind ? { kind } : undefined,
  parent: null,
});

describe("explorerDropRules", () => {
  it("card は cardSet へは drop できる", () => {
    const disabled = shouldDisableExplorerDrop({
      parentNode: createNode("cardSet-1", "cardSet"),
      dragNodes: [createNode("card-1", "card")],
    });

    expect(disabled).toBe(false);
  });

  it("card -> folder/root は disableDrop される", () => {
    const toFolder = shouldDisableExplorerDrop({
      parentNode: createNode("folder-1", "folder"),
      dragNodes: [createNode("card-1", "card")],
    });
    const toRoot = shouldDisableExplorerDrop({
      parentNode: createNode("root"),
      dragNodes: [createNode("card-1", "card")],
    });

    expect(toFolder).toBe(true);
    expect(toRoot).toBe(true);
  });

  it("cardSet -> folder は許可される", () => {
    const disabled = shouldDisableExplorerDrop({
      parentNode: createNode("folder-1", "folder"),
      dragNodes: [createNode("set-1", "cardSet")],
    });

    expect(disabled).toBe(false);
  });
});
