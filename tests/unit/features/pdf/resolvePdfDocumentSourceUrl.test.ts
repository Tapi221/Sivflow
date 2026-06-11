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
  it("local/blob を stream 可能な永続 URL より優先する", () => {
    const document = createDocument({
      blobUrl: "blob:http://localhost/blob-pdf",
      localUrl: "blob:http://localhost/local-pdf",
      remoteUrl: "https://firebasestorage.googleapis.com/v0/b/example.pdf",
      downloadUrl: "https://drive.google.com/uc?id=file-1&export=download",
      googleDriveWebContentLink: "https://drive.google.com/uc?id=file-2&export=download",
    });

    expect(resolvePdfDocumentSourceUrl(document)).toBe("blob:http://localhost/local-pdf");
  });

  it("localUrl がない場合は blobUrl を優先する", () => {
    const document = createDocument({
      blobUrl: "blob:http://localhost/blob-pdf",
      downloadUrl: "https://drive.google.com/uc?id=file-1&export=download",
      googleDriveWebContentLink: "https://drive.google.com/uc?id=file-2&export=download",
    });

    expect(resolvePdfDocumentSourceUrl(document)).toBe("blob:http://localhost/blob-pdf");
  });

  it("local/blob がない場合は Google Drive view URL を避けて次の有効な URL にフォールバックする", () => {
    const document = createDocument({
      remoteUrl: "https://drive.google.com/file/d/file-1/view?usp=drivesdk",
      downloadUrl: "https://drive.google.com/uc?id=file-1&export=download",
    });

    expect(resolvePdfDocumentSourceUrl(document)).toBe("https://drive.google.com/uc?id=file-1&export=download");
  });

  it("local/blob と remote/download がない場合は Google Drive の webContentLink を使う", () => {
    const document = createDocument({
      googleDriveWebContentLink: "https://drive.google.com/uc?id=file-1&export=download",
    });

    expect(resolvePdfDocumentSourceUrl(document)).toBe("https://drive.google.com/uc?id=file-1&export=download");
  });

  it("localUrl があれば blobUrl より優先する", () => {
    const document = createDocument({
      blobUrl: "blob:http://localhost/blob-pdf",
      localUrl: "blob:http://localhost/local-pdf",
    });

    expect(resolvePdfDocumentSourceUrl(document)).toBe("blob:http://localhost/local-pdf");
  });

  it("Google Drive の view URL だけなら PDF ソースとして使わない", () => {
    const document = createDocument({
      downloadUrl: "https://drive.google.com/file/d/file-1/view?usp=drivesdk",
      googleDriveWebViewLink: "https://drive.google.com/file/d/file-1/view?usp=drivesdk",
    });

    expect(resolvePdfDocumentSourceUrl(document)).toBeNull();
  });
});
