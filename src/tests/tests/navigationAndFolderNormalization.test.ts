import { describe, expect, it } from "vitest";
import { normalizeFolderWithSilent } from "@/domain/folder/normalizers/normalizeFolder";
import { resolveAppDestination } from "@/navigation/core/destination";
import { createPageUrl, toWebPath } from "@/platform/web/navigation/toWebPath";

describe("navigation adapters", () => {
  it("preserves legacy createPageUrl behavior through destination resolution", () => {
    const destination = resolveAppDestination("CardSetView?folderId=folder-1");

    expect(destination).toEqual({
      kind: "screen",
      screen: "cardSetView",
      query: "folderId=folder-1",
      sourceName: "CardSetView",
    });
    expect(toWebPath(destination)).toBe("/CardSetView?folderId=folder-1");
    expect(createPageUrl("CardSetView?folderId=folder-1")).toBe(
      "/CardSetView?folderId=folder-1",
    );
  });

  it("keeps unknown page fallback behavior", () => {
    expect(createPageUrl("CustomScreen")).toBe("/customscreen");
    expect(createPageUrl("CustomScreen?mode=debug")).toBe(
      "/CustomScreen?mode=debug",
    );
  });
});

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
