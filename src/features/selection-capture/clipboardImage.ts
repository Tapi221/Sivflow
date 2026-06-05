const DEFAULT_IMAGE_MIME_TYPE = "image/png";

const isTauriRuntime = (): boolean => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const writeImageBlobToTauriClipboard = async (blob: Blob): Promise<boolean> => {
  if (!isTauriRuntime()) return false;

  const { writeImage } = await import("@tauri-apps/plugin-clipboard-manager");
  await writeImage(await blob.arrayBuffer());
  return true;
};

export const copyImageBlobToClipboard = async (blob: Blob): Promise<void> => {
  const copiedByTauri = await writeImageBlobToTauriClipboard(blob);
  if (copiedByTauri) return;

  if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
    throw new Error("Image clipboard is not supported in this environment.");
  }

  await navigator.clipboard.write([
    new ClipboardItem({ [blob.type || DEFAULT_IMAGE_MIME_TYPE]: blob }),
  ]);
};
