import { describe, expect, it } from "vitest";
import { resolvePdfDocumentSourceUrl } from "@/features/pdf/resolvePdfDocumentSourceUrl";
import type { DocumentItem } from "@/types";

const createDocument = (overrides: Partial<DocumentItem> = {}): DocumentItem => ({
  id: "doc-1",
  userId: "user-1",
  deviceId: "device-1",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  isDeleted: false,
  kind: "pdf",
  folderId: "folder-1",
  orderIndex: 0,
  title: "Sample PDF",
  fileName: "sample.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
  blobUrl: null,
  localUrl: null,
  remoteUrl: null,
  localFileId: "doc-1",
  storagePath: null,
  downloadUrl: null,
  googleDriveFileId: null,
  googleDriveWebViewLink: null,
  googleDriveWebContentLink: null,
  ...overrides,
});

describe("resolvePdfDocumentSourceUrl", () => {
  it("remote/download/webContent の順で stream 可能な URL を local/blob より優先する", () => {
    const document = createDocument({
      blobUrl: "blob:http://localhost/blob-pdf",
      localUrl: "blob:http://localhost/local-pdf",
      remoteUrl: "https://firebasestorage.googleapis.com/v0/b/example.pdf",
      downloadUrl: "https://drive.google.com/uc?id=file-1&export=download",
      googleDriveWebContentLink: "https://drive.google.com/uc?id=file-2&export=download",
    });

    expect(resolvePdfDocumentSourceUrl(document)).toBe("https://firebasestorage.googleapis.com/v0/b/example.pdf");
  });

  it("remoteUrl がない場合は downloadUrl を local/blob より優先する", () => {
    const document = createDocument({
      blobUrl: "blob:http://localhost/blob-pdf",
      localUrl: "blob:http://localhost/local-pdf",
      downloadUrl: "https://drive.google.com/uc?id=file-1&export=download",
      googleDriveWebContentLink: "https://drive.google.com/uc?id=file-2&export=download",
    });

    expect(resolvePdfDocumentSourceUrl(document)).toBe("https://drive.google.com/uc?id=file-1&export=download");
  });

  it("remoteUrl と downloadUrl がない場合は Google Drive の webContentLink を使う", () => {
    const document = createDocument({
      blobUrl: "blob:http://localhost/blob-pdf",
      localUrl: "blob:http://localhost/local-pdf",
      googleDriveWebContentLink: "https://drive.google.com/uc?id=file-1&export=download",
    });

    expect(resolvePdfDocumentSourceUrl(document)).toBe("https://drive.google.com/uc?id=file-1&export=download");
  });

  it("stream 可能な URL がない場合だけ local/blob を使う", () => {
    const document = createDocument({
      blobUrl: "blob:http://localhost/blob-pdf",
      localUrl: "blob:http://localhost/local-pdf",
    });

    expect(resolvePdfDocumentSourceUrl(document)).toBe("blob:http://localhost/local-pdf");
  });

  it("Google Drive の view URL は PDF ソースとして使わない", () => {
    const document = createDocument({
      downloadUrl: "https://drive.google.com/file/d/file-1/view?usp=drivesdk",
      googleDriveWebViewLink: "https://drive.google.com/file/d/file-1/view?usp=drivesdk",
    });

    expect(resolvePdfDocumentSourceUrl(document)).toBeNull();
  });
});
