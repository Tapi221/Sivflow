import { describe, expect, it } from "vitest";
import { normalizeVisibleFolders } from "@/hooks/folder/useFoldersRead";

describe("normalizeVisibleFolders", () => {
  it("does not drop active folders before deletion fields are normalized", () => {
    const folders = normalizeVisibleFolders([
      {
        id: "project-1",
        folderName: "Project Alpha",
        isDeleted: "false",
      },
      {
        id: "project-2",
        folderName: "Project Beta",
        isDeleted: false,
      },
      {
        id: "deleted-project",
        folderName: "Deleted Project",
        isDeleted: true,
      },
    ]);

    expect(folders.map((folder) => folder.id)).toEqual([
      "project-1",
      "project-2",
    ]);
  });
});
