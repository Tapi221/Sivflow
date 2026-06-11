import { beforeEach, describe, expect, it, vi } from "vitest";
import { findLocalPdfBlob, resolvePdfDocumentBlob } from "@/features/pdf/resolvePdfDocumentBlob";
import type { DocumentItem } from "@/types";

const {
  downloadPdfFromGoogleDriveMock,
  getDocumentBlobMock,
  requestGoogleDriveFileAccessTokenMock,
  saveDocumentBlobMock,
} = vi.hoisted(() => ({
  downloadPdfFromGoogleDriveMock: vi.fn(),
  getDocumentBlobMock: vi.fn(),
  requestGoogleDriveFileAccessTokenMock: vi.fn(),
  saveDocumentBlobMock: vi.fn(),
}));

vi.mock("@/services/documentFileStore", () => ({
  getDocumentBlob: getDocumentBlobMock,
  saveDocumentBlob: saveDocumentBlobMock,
}));

vi.mock("@/integration/google-integration/googleDrive.oauth", () => ({
  requestGoogleDriveFileAccessToken: requestGoogleDriveFileAccessTokenMock,
}));

vi.mock("@/integration/google-integration/googleDrive.pdfDownload", () => ({
  downloadPdfFromGoogleDrive: downloadPdfFromGoogleDriveMock,
}));

vi.mock("@/services/firebase", () => ({
  auth: { currentUser: { uid: "user-1" } },
}));

const createDocument = (
  overrides: Partial<DocumentItem> = {},
): DocumentItem => ({
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
  localFileId: "local-doc-1",
  storagePath: null,
  downloadUrl: null,
  googleDriveFileId: null,
  googleDriveWebViewLink: null,
  googleDriveWebContentLink: null,
  ...overrides,
});

describe("resolvePdfDocumentBlob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ローカル Blob が見つかれば Drive に行かない", async () => {
    const localBlob = new Blob(["local"], { type: "application/pdf" });
    getDocumentBlobMock.mockResolvedValueOnce(localBlob);

    await expect(
      findLocalPdfBlob(createDocument(), "user-1"),
    ).resolves.toBe(localBlob);

    expect(getDocumentBlobMock).toHaveBeenCalledWith("local-doc-1", {
      userId: "user-1",
    });
  });

  it("ローカルに無ければ Google Drive から取得してキャッシュする", async () => {
    const driveBlob = new Blob(["drive"], { type: "application/pdf" });
    getDocumentBlobMock.mockResolvedValue(null);
    requestGoogleDriveFileAccessTokenMock.mockResolvedValue("token-1");
    downloadPdfFromGoogleDriveMock.mockResolvedValue(driveBlob);
    saveDocumentBlobMock.mockResolvedValue(undefined);

    await expect(
      resolvePdfDocumentBlob(
        createDocument({ googleDriveFileId: "drive-file-1" }),
        "user-1",
      ),
    ).resolves.toBe(driveBlob);

    expect(requestGoogleDriveFileAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(downloadPdfFromGoogleDriveMock).toHaveBeenCalledWith({
      accessToken: "token-1",
      fileId: "drive-file-1",
    });
    expect(saveDocumentBlobMock).toHaveBeenCalledWith(
      "local-doc-1",
      driveBlob,
      { userId: "user-1" },
    );
  });

  it("Google Drive file id が無ければ null を返す", async () => {
    getDocumentBlobMock.mockResolvedValue(null);

    await expect(
      resolvePdfDocumentBlob(createDocument(), "user-1"),
    ).resolves.toBeNull();

    expect(requestGoogleDriveFileAccessTokenMock).not.toHaveBeenCalled();
    expect(downloadPdfFromGoogleDriveMock).not.toHaveBeenCalled();
  });
});
