type CachedGoogleProfileImageResult = {
  dataUrl: string | null;
};

const MAX_PROFILE_IMAGE_BYTES = 256 * 1024;

const toErrorSummary = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { type: typeof error };
};

const isAllowedImageContentType = (contentType: string | null): contentType is string => Boolean(contentType?.startsWith("image/"));

const toDataUrl = (contentType: string, payload: ArrayBuffer): string => {
  const base64 = Buffer.from(payload).toString("base64");
  return `data:${contentType};base64,${base64}`;
};

const readImagePayload = async (url: string): Promise<CachedGoogleProfileImageResult> => {
  const response = await fetch(url, { redirect: "follow" });
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? null;
  const contentLength = Number(response.headers.get("content-length") ?? "0");

  if (!response.ok || !isAllowedImageContentType(contentType)) return { dataUrl: null };
  if (Number.isFinite(contentLength) && contentLength > MAX_PROFILE_IMAGE_BYTES) return { dataUrl: null };

  const payload = await response.arrayBuffer();
  if (payload.byteLength > MAX_PROFILE_IMAGE_BYTES) return { dataUrl: null };

  return { dataUrl: toDataUrl(contentType, payload) };
};

export const cacheGoogleProfileImageDataUrl = async (sourceUrl: string | null): Promise<string | null> => {
  if (!sourceUrl) return null;

  try {
    const result = await readImagePayload(sourceUrl);
    return result.dataUrl;
  } catch (error) {
    console.warn("[GoogleProfileImage] cache failed", { error: toErrorSummary(error) });
    return null;
  }
};
