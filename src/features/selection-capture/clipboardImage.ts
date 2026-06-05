const DEFAULT_IMAGE_MIME_TYPE = "image/png";

const writeImageBlobToDesktopClipboard = async (blob: Blob): Promise<boolean> => {
  const writeImage = window.desktop?.clipboard?.writeImage;
  if (typeof writeImage !== "function") return false;

  await writeImage({
    data: await blob.arrayBuffer(),
    mimeType: blob.type || DEFAULT_IMAGE_MIME_TYPE,
  });
  return true;
};

export const copyImageBlobToClipboard = async (blob: Blob): Promise<void> => {
  const copiedByDesktop = await writeImageBlobToDesktopClipboard(blob);
  if (copiedByDesktop) return;

  if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
    throw new Error("Image clipboard is not supported in this environment.");
  }

  await navigator.clipboard.write([
    new ClipboardItem({ [blob.type || DEFAULT_IMAGE_MIME_TYPE]: blob }),
  ]);
};
