import { describe, expect, it } from "vitest";
import { normalizeVisibleFolders } from "@/features/folder/hooks/useFoldersRead";

describe("normalizeVisibleFolders", () => {
  it("normalizes visible folder rows", () => {
    const folders = normalizeVisibleFolders([
      { id: "project-1", folderName: "Project Alpha", isDeleted: "false" },
      { id: "project-2", folderName: "Project Beta", isDeleted: false },
      { id: "project-3", folderName: "Project Gamma", isDeleted: true },
    ]);

    expect(folders.map((folder) => folder.id)).toEqual(["project-1", "project-2"]);
  });
});
