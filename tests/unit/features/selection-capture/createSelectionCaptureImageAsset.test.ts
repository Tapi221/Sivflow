import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSelectionCaptureImageAsset } from "@/features/selection-capture/createSelectionCaptureImageAsset";

const upsert = vi.fn();
const enqueueAssetUpload = vi.fn();
const processAssetQueue = vi.fn();

vi.mock("@/services/imageFileStore", () => ({
  putImageBlob: vi.fn(async () => ({
    localBlobId: "local-blob-1",
    mime: "image/png",
    size: 512,
  })),
}));

vi.mock("@/services/imageBlobUrlSessionCache", () => ({
  getOrCreateImageBlobUrl: vi.fn(async () => "blob:preview"),
}));

vi.mock("@/services/localDB", () => ({
  getLocalDb: vi.fn(async () => ({ upsert })),
}));

vi.mock("@/services/PersistentOfflineQueue", () => ({
  persistentQueue: {
    enqueueAssetUpload,
    processAssetQueue,
  },
}));

vi.mock("@/utils/uploaded-image/naturalSize.utils", () => ({
  loadImageNaturalSize: vi.fn(async () => ({ naturalW: 640, naturalH: 360 })),
}));

describe("createSelectionCaptureImageAsset", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", { randomUUID: () => "asset-123" });
    upsert.mockClear();
    enqueueAssetUpload.mockClear();
    processAssetQueue.mockClear();
  });

  it("stores the captured blob as an image asset and queues upload", async () => {
    const blob = new Blob(["png"], { type: "image/png" });

    const image = await createSelectionCaptureImageAsset({
      blob,
      userId: "user-1",
    });

    expect(upsert).toHaveBeenCalledWith(
      "images",
      expect.objectContaining({
        id: "asset-123",
        userId: "user-1",
        localBlobId: "local-blob-1",
        remoteKey: "users/user-1/assets/asset-123",
        remoteStatus: "uploading",
        width: 640,
        height: 360,
      }),
    );
    expect(enqueueAssetUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: "asset-123",
        userId: "user-1",
        remoteKey: "users/user-1/assets/asset-123",
        mime: "image/png",
        size: 512,
        fileName: "asset-123.png",
      }),
      expect.any(File),
    );
    expect(processAssetQueue).toHaveBeenCalledTimes(1);
    expect(image).toEqual(
      expect.objectContaining({
        id: "asset-123",
        assetId: "asset-123",
        localFileId: "local-blob-1",
        status: "uploading",
        storagePath: "users/user-1/assets/asset-123",
        contentType: "image/png",
        naturalW: 640,
        naturalH: 360,
      }),
    );
  });
});
