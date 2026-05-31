import { renderHook } from "@testing-library/react-hooks";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useReliableFileUpload } from "@/hooks/useReliableFileUpload";

vi.mock("@/services/firebase", () => ({
  auth: { currentUser: { uid: "test-user-id" } },
  storage: {},
  db: {},
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ currentUser: { uid: "test-user-id" } }),
}));

describe("useReliableFileUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("初期状態は idle ステータスになる", () => {
    const { result } = renderHook(() => useReliableFileUpload());
    expect(result.current.uploadStatus).toBe("idle");
    expect(result.current.uploadProgress).toBe(0);
  });

  it("ファイルサイズを検証する", async () => {
    const { result } = renderHook(() => useReliableFileUpload());

    const largeFile = new File(["x".repeat(11 * 1024 * 1024)], "large.jpg", {
      type: "image/jpeg",
    });
    const pathGen = (name: string) => `path/${name}`;

    try {
      await result.current.uploadFile(largeFile, pathGen);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain("ファイルサイズが大きすぎます");
    }

    expect(result.current.uploadStatus).toBe("failed");
  });

  it("MIME タイプを検証する", async () => {
    const { result } = renderHook(() => useReliableFileUpload());

    const textFile = new File(["test"], "test.txt", { type: "text/plain" });
    const pathGen = (name: string) => `path/${name}`;

    try {
      await result.current.uploadFile(textFile, pathGen, {
        type: "card_image",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain("サポートされていないファイル形式です");
    }

    expect(result.current.uploadStatus).toBe("failed");
  });
});
