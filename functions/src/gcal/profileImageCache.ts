import crypto from "node:crypto";
import { getAdminStorage } from "#src/firebaseAdmin.js";

type CachedGoogleProfileImageResult = {
  contentType: string;
  payload: Buffer;
};

const MAX_PROFILE_IMAGE_BYTES = 256 * 1024;
const PROFILE_IMAGE_CACHE_ROOT = "google-profile-images";
const DOWNLOAD_TOKEN_METADATA_KEY = "firebaseStorageDownloadTokens";

const toErrorSummary = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { type: typeof error };
};
const isAllowedImageContentType = (contentType: string | null): contentType is string => Boolean(contentType?.startsWith("image/"));
const readImagePayload = async (url: string): Promise<CachedGoogleProfileImageResult | null> => {
  const response = await fetch(url, { redirect: "follow" });
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? null;
  const contentLength = Number(response.headers.get("content-length") ?? "0");

  if (!response.ok || !isAllowedImageContentType(contentType)) return null;
  if (Number.isFinite(contentLength) && contentLength > MAX_PROFILE_IMAGE_BYTES) return null;

  const payload = Buffer.from(await response.arrayBuffer());
  if (payload.byteLength > MAX_PROFILE_IMAGE_BYTES) return null;

  return { contentType, payload };
};
const getStorageProfileImagePath = (uid: string, sourceUrl: string): string => {
  const digest = crypto.createHash("sha256").update(sourceUrl).digest("hex").slice(0, 24);
  return `${PROFILE_IMAGE_CACHE_ROOT}/${uid}/${digest}`;
};
const buildDownloadUrl = (bucketName: string, path: string, token: string): string => {
  const encodedPath = encodeURIComponent(path);
  const encodedToken = encodeURIComponent(token);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${encodedToken}`;
};
const cacheGoogleProfileImageUrl = async (uid: string, sourceUrl: string | null): Promise<string | null> => {
  if (!sourceUrl) return null;

  try {
    const image = await readImagePayload(sourceUrl);
    if (!image) return null;

    const storage = await getAdminStorage();
    const bucket = storage.bucket();
    const path = getStorageProfileImagePath(uid, sourceUrl);
    const token = crypto.randomUUID();
    const file = bucket.file(path);

    await file.save(image.payload, { contentType: image.contentType, metadata: { metadata: { [DOWNLOAD_TOKEN_METADATA_KEY]: token } } });
    return buildDownloadUrl(bucket.name, path, token);
  } catch (error) {
    console.warn("[GoogleProfileImage] cache failed", { error: toErrorSummary(error) });
    return null;
  }
};

export { cacheGoogleProfileImageUrl };
