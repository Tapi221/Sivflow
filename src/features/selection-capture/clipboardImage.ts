import { invoke } from "@tauri-apps/api/core";



type TauriClipboardImageInput = {
  mimeType: string;
  data: number[];
};



const DEFAULT_IMAGE_MIME_TYPE = "image/png";



const isTauriRuntime = (): boolean => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const arrayBufferToNumberArray = (buffer: ArrayBuffer): number[] => Array.from(new Uint8Array(buffer));
const createTauriClipboardImageInput = async (blob: Blob): Promise<TauriClipboardImageInput> => ({
  mimeType: blob.type || DEFAULT_IMAGE_MIME_TYPE,
  data: arrayBufferToNumberArray(await blob.arrayBuffer()),
});
const writeImageBlobToTauriClipboard = async (blob: Blob): Promise<boolean> => {
  if (!isTauriRuntime()) return false;

  try {
    await invoke<void>("clipboard_write_image", { input: await createTauriClipboardImageInput(blob) });
    return true;
  } catch (error) {
    console.warn("[clipboardImage] Tauri image clipboard failed", error);
    return false;
  }
};
const copyImageBlobToClipboard = async (blob: Blob): Promise<void> => {
  const copiedByTauri = await writeImageBlobToTauriClipboard(blob);
  if (copiedByTauri) return;

  if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
    throw new Error("Image clipboard is not supported in this environment.");
  }

  await navigator.clipboard.write([
    new ClipboardItem({ [blob.type || DEFAULT_IMAGE_MIME_TYPE]: blob }),
  ]);
};



export { copyImageBlobToClipboard };
