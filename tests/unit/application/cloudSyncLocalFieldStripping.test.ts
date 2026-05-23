import { describe, expect, it } from "vitest";

import { stripCloudSyncLocalOnlyFields } from "@/application/usecases/cloudSyncLocalFieldStripping";

describe("stripCloudSyncLocalOnlyFields", () => {
  it("removes local-only image fields from card payloads", () => {
    const record = {
      lastSyncedAt: new Date(),
      syncState: "pending",
      lastSyncedByDeviceId: "device-a",
      front: {
        blocks: [
          {
            type: "image",
            images: [
              {
                id: "asset-1",
                assetId: "asset-1",
                localFileId: "local-1",
                localUrl: "blob:http://localhost/local-1",
                blobUrl: "blob:http://localhost/blob-1",
                remoteUrl: "https://example.com/image.png",
                storagePath: "users/u/assets/asset-1",
              },
            ],
          },
        ],
        attachments: {
          images: [
            {
              id: "asset-2",
              assetId: "asset-2",
              local_file_id: "local-2",
              local_url: "blob:http://localhost/local-2",
              url: "blob:http://localhost/url-2",
              storagePath: "users/u/assets/asset-2",
            },
          ],
        },
      },
      back: { blocks: [] },
    };

    const stripped = stripCloudSyncLocalOnlyFields("card", record);

    expect(stripped).not.toHaveProperty("lastSyncedAt");
    expect(stripped).not.toHaveProperty("syncState");
    expect(stripped).not.toHaveProperty("lastSyncedByDeviceId");

    const front = stripped.front as {
      blocks: Array<{ images: Array<Record<string, unknown>> }>;
      attachments: { images: Array<Record<string, unknown>> };
    };
    const blockImage = front.blocks[0].images[0];
    const attachmentImage = front.attachments.images[0];

    expect(blockImage).toMatchObject({
      id: "asset-1",
      assetId: "asset-1",
      remoteUrl: "https://example.com/image.png",
      storagePath: "users/u/assets/asset-1",
    });
    expect(blockImage).not.toHaveProperty("localFileId");
    expect(blockImage).not.toHaveProperty("localUrl");
    expect(blockImage).not.toHaveProperty("blobUrl");

    expect(attachmentImage).toMatchObject({
      id: "asset-2",
      assetId: "asset-2",
      url: null,
      storagePath: "users/u/assets/asset-2",
    });
    expect(attachmentImage).not.toHaveProperty("local_file_id");
    expect(attachmentImage).not.toHaveProperty("local_url");
  });
});
