const isBlob = (value: unknown): value is Blob => {
  return value instanceof Blob;
};
const isHeicFile = (file: File) => {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
};
const convertHeicToJpeg = async (file: File): Promise<File> => {
  const heic2anyModule = await import("heic2any");
  const heic2any =
    (heic2anyModule as { default?: unknown; }).default ?? heic2anyModule;

  if (typeof heic2any !== "function") {
    throw new Error("heic2any の読み込みに失敗しました");
  }

  const result = await (
    heic2any as (options: {
      blob: File;
      toType: string;
      quality: number;
    }) => Promise<unknown>
  )({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  });

  const candidate = Array.isArray(result) ? result[0] : result;

  if (!isBlob(candidate)) {
    throw new Error("HEIC 変換結果が Blob ではありません");
  }

  const blob = candidate;
  const name = file.name.replace(/\.(heic|heif)$/i, ".jpg");

  return new File([blob], name, { type: blob.type ?? "image/jpeg" });
};



export { isHeicFile, convertHeicToJpeg };
