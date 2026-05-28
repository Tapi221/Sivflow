import { describe, expect, it } from "vitest";
import { normalizeFolderWithSilent } from "@/domain/folder/normalizers/normalizeFolder";

describe("normalizeFolderWithSilent", () => {
  it("maps legacy silent into isSilent and synthesizes deletedAt", () => {
    const updatedAt = new Date("2026-04-01T00:00:00.000Z");

    const normalized = normalizeFolderWithSilent({
      id: "folder-1",
      folder_name: "Inbox",
      silent: true,
      is_deleted: true,
      updated_at: updatedAt.toISOString(),
    });

    expect(normalized.isSilent).toBe(true);
    expect(normalized.isDeleted).toBe(true);
    expect(normalized.deletedAt?.toISOString()).toBe(updatedAt.toISOString());
  });
});