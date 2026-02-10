import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  CONVERTER_TOKEN_SECRET_ENV,
  asNonEmptyString,
  isScopedStoragePath,
  resolveConverterEndpointFromEnv,
} from "./pptxConverterGuards";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

type ConversionStatus = "queued" | "processing" | "ready" | "failed";

type ConversionDocData = {
  status?: ConversionStatus | string;
  sourceStoragePath?: string;
  manifestPath?: string;
  slideCount?: number;
  fallbackPdfPath?: string;
  errorMessage?: string;
};

type ConversionResult = {
  manifestPath: string;
  slideCount: number | null;
  fallbackPdfPath: string | null;
};

type ManifestSlideLike = {
  index?: unknown;
  path?: unknown;
  url?: unknown;
  width?: unknown;
  height?: unknown;
};

type ManifestLike = {
  docId?: string;
  userId?: string;
  slideCount?: number;
  slides?: Array<ManifestSlideLike>;
  fallbackPdfPath?: string;
};

const ERROR_MESSAGE_LIMIT = 400;
const DEFAULT_BUCKET = admin.storage().bucket();
const CONVERTER_REQUEST_TIMEOUT_MS = 15_000;
const ENDPOINT_FALLBACK_ERRORS = new Set([
  "converter_placeholder_disabled",
  "converter_token_misconfigured",
]);

const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
};

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const normalizeStatus = (value: unknown): ConversionStatus | null => {
  if (value === "queued" || value === "processing" || value === "ready" || value === "failed") {
    return value;
  }
  return null;
};

const CONVERTER_ENDPOINT = resolveConverterEndpointFromEnv();

const toSafeErrorMessage = (error: unknown): string => {
  if (!error) return "unknown_error";
  if (typeof error === "string") return error.slice(0, ERROR_MESSAGE_LIMIT);
  const maybeName = (error as any)?.name ? `${(error as any).name}: ` : "";
  const maybeMessage = (error as any)?.message ?? JSON.stringify(error);
  return `${maybeName}${String(maybeMessage)}`.slice(0, ERROR_MESSAGE_LIMIT);
};

const isSafeManifestPathValue = (value: string, userId: string, docId: string): boolean =>
  isHttpUrl(value) || isScopedStoragePath(value, userId, docId);

const resolveManifestMetadata = async (manifestPath: string, userId: string, docId: string): Promise<ConversionResult> => {
  if (!isScopedStoragePath(manifestPath, userId, docId)) {
    throw new Error(`manifest_scope_violation:${manifestPath}`);
  }

  const file = DEFAULT_BUCKET.file(manifestPath);
  const [exists] = await file.exists();
  if (!exists) {
    throw new Error(`manifest_not_found:${manifestPath}`);
  }

  const [contents] = await file.download();
  let parsed: ManifestLike;
  try {
    parsed = JSON.parse(contents.toString("utf8")) as ManifestLike;
  } catch {
    throw new Error("manifest_invalid_json");
  }

  if (asNonEmptyString(parsed.docId) && parsed.docId !== docId) {
    throw new Error("manifest_docid_mismatch");
  }
  if (asNonEmptyString(parsed.userId) && parsed.userId !== userId) {
    throw new Error("manifest_userid_mismatch");
  }

  if (parsed.slides !== undefined && !Array.isArray(parsed.slides)) {
    throw new Error("manifest_slides_invalid_type");
  }

  if (Array.isArray(parsed.slides)) {
    for (const slide of parsed.slides) {
      if (!slide || typeof slide !== "object") {
        throw new Error("manifest_slide_invalid_entry");
      }
      const slidePath = asNonEmptyString(slide.path);
      if (slidePath && !isSafeManifestPathValue(slidePath, userId, docId)) {
        throw new Error("manifest_slide_path_scope_violation");
      }
      const slideUrl = asNonEmptyString(slide.url);
      if (slideUrl && !isSafeManifestPathValue(slideUrl, userId, docId)) {
        throw new Error("manifest_slide_url_scope_violation");
      }
    }
  }

  const fallbackPdfPath = asNonEmptyString(parsed.fallbackPdfPath);
  if (fallbackPdfPath && !isSafeManifestPathValue(fallbackPdfPath, userId, docId)) {
    throw new Error("manifest_fallback_scope_violation");
  }

  const slideCountFromField = asFiniteNumber(parsed.slideCount);
  const slideCountFromSlides = Array.isArray(parsed.slides) ? parsed.slides.length : null;
  const slideCount = slideCountFromField ?? slideCountFromSlides;

  return {
    manifestPath,
    slideCount,
    fallbackPdfPath,
  };
};

const getConverterToken = (): string => {
  const token = asNonEmptyString(process.env[CONVERTER_TOKEN_SECRET_ENV]);
  if (!token) {
    throw new Error("converter_token_not_configured");
  }
  return token;
};

const parseConverterErrorPayload = async (response: Response): Promise<string | null> => {
  const contentType = response.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const parsed = (await response.json()) as { error?: unknown; message?: unknown };
      return asNonEmptyString(parsed.error) ?? asNonEmptyString(parsed.message) ?? null;
    }
    const text = await response.text();
    return asNonEmptyString(text);
  } catch {
    return null;
  }
};

const shouldTreatAsEndpointUnavailable = (error: unknown): boolean => {
  const message =
    typeof error === "string"
      ? error
      : asNonEmptyString((error as any)?.message) ?? "";
  if (!message) return false;

  if (message === "converter_token_not_configured") {
    return true;
  }

  if (!message.startsWith("converter_http_503")) {
    return false;
  }

  for (const marker of ENDPOINT_FALLBACK_ERRORS) {
    if (message.includes(`:${marker}`)) return true;
  }
  return false;
};

const requestExternalConversion = async (
  userId: string,
  docId: string,
  sourceStoragePath: string
): Promise<ConversionResult> => {
  if (!CONVERTER_ENDPOINT) {
    throw new Error("converter_endpoint_not_configured");
  }

  const token = getConverterToken();
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, CONVERTER_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(CONVERTER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-pptx-converter-token": token,
      },
      body: JSON.stringify({
        userId,
        docId,
        sourceStoragePath,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as any)?.name === "AbortError") {
      throw new Error(`converter_timeout_${CONVERTER_REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }

  if (!response.ok) {
    const converterError = await parseConverterErrorPayload(response);
    const statusDetail = converterError ? `:${converterError}` : "";
    throw new Error(`converter_http_${response.status}${statusDetail}`);
  }

  const payload = (await response.json()) as {
    manifestPath?: string;
    slideCount?: number;
    fallbackPdfPath?: string;
  };

  const manifestPath = asNonEmptyString(payload.manifestPath);
  if (!manifestPath) {
    throw new Error("converter_response_missing_manifestPath");
  }

  return {
    manifestPath,
    slideCount: asFiniteNumber(payload.slideCount),
    fallbackPdfPath: asNonEmptyString(payload.fallbackPdfPath),
  };
};

const runConversion = async (
  userId: string,
  docId: string,
  sourceStoragePath: string
): Promise<ConversionResult> => {
  const defaultManifestPath = `users/${userId}/documents/${docId}/pptx/manifest.json`;

  if (CONVERTER_ENDPOINT) {
    try {
      const external = await requestExternalConversion(userId, docId, sourceStoragePath);
      const fromStorage = await resolveManifestMetadata(external.manifestPath, userId, docId);
      return {
        manifestPath: fromStorage.manifestPath,
        slideCount: external.slideCount ?? fromStorage.slideCount,
        fallbackPdfPath: external.fallbackPdfPath ?? fromStorage.fallbackPdfPath,
      };
    } catch (error) {
      if (!shouldTreatAsEndpointUnavailable(error)) {
        throw error;
      }
      console.warn("[PptxConversion] Converter endpoint unavailable, falling back to storage manifest", {
        userId,
        docId,
        sourceStoragePath,
        error: toSafeErrorMessage(error),
      });
      return resolveManifestMetadata(defaultManifestPath, userId, docId);
    }
  }

  return resolveManifestMetadata(defaultManifestPath, userId, docId);
};

export const onPptxConversionQueued = functions
  .runWith({ secrets: [CONVERTER_TOKEN_SECRET_ENV] })
  .firestore
  .document("users/{userId}/pptxConversions/{docId}")
  .onWrite(async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
    const after = change.after;
    if (!after.exists) return;

    const afterData = after.data() as ConversionDocData;
    const nextStatus = normalizeStatus(afterData.status);
    if (nextStatus !== "queued") return;

    const userId = String(context.params.userId || "").trim();
    const docId = String(context.params.docId || "").trim();
    if (!userId || !docId) {
      console.warn("[PptxConversion] Missing userId/docId in trigger context", context.params);
      return;
    }

    const sourceStoragePath = asNonEmptyString(afterData.sourceStoragePath);
    const conversionRef = after.ref;
    const documentRef = admin.firestore().doc(`users/${userId}/documents/${docId}`);

    if (!sourceStoragePath) {
      const reason = "source_storage_path_missing";
      await conversionRef.set(
        {
          status: "failed",
          errorMessage: reason,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await documentRef.set(
        {
          convertStatus: "failed",
          pptxManifestStatus: "failed",
          pptxLastError: reason,
          pptx: {
            error: reason,
            updatedAt: FieldValue.serverTimestamp(),
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return;
    }

    if (!isScopedStoragePath(sourceStoragePath, userId, docId)) {
      const reason = "source_storage_path_scope_violation";
      await conversionRef.set(
        {
          status: "failed",
          errorMessage: reason,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      await documentRef.set(
        {
          convertStatus: "failed",
          pptxManifestStatus: "failed",
          pptxLastError: reason,
          pptx: {
            error: reason,
            updatedAt: FieldValue.serverTimestamp(),
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return;
    }

    const claimed = await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(conversionRef);
      if (!snap.exists) return false;
      const currentStatus = normalizeStatus((snap.data() as ConversionDocData)?.status);
      if (currentStatus !== "queued") return false;

      tx.set(
        conversionRef,
        {
          status: "processing",
          processingStartedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return true;
    });

    if (!claimed) {
      return;
    }

    await documentRef.set(
      {
        convertStatus: "processing",
        pptxManifestStatus: "processing",
        pptxLastError: null,
        pptx: {
          error: null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    try {
      const result = await runConversion(userId, docId, sourceStoragePath);

      await conversionRef.set(
        {
          status: "ready",
          manifestPath: result.manifestPath,
          slideCount: result.slideCount,
          fallbackPdfPath: result.fallbackPdfPath,
          errorMessage: FieldValue.delete(),
          convertedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await documentRef.set(
        {
          convertStatus: "ready",
          pptxManifestStatus: "ready",
          pptxManifestPath: result.manifestPath,
          pptxSlideCount: result.slideCount,
          pptxLastError: null,
          pptxConvertedAt: FieldValue.serverTimestamp(),
          pptx: {
            manifestPath: result.manifestPath,
            fallbackPdfPath: result.fallbackPdfPath,
            slideCount: result.slideCount,
            error: null,
            updatedAt: FieldValue.serverTimestamp(),
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.info("[PptxConversion] Conversion succeeded", {
        userId,
        docId,
        manifestPath: result.manifestPath,
        slideCount: result.slideCount,
      });
    } catch (error) {
      const reason = toSafeErrorMessage(error);
      console.error("[PptxConversion] Conversion failed", {
        userId,
        docId,
        sourceStoragePath,
        error,
      });

      await conversionRef.set(
        {
          status: "failed",
          errorMessage: reason,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await documentRef.set(
        {
          convertStatus: "failed",
          pptxManifestStatus: "failed",
          pptxLastError: reason,
          pptx: {
            error: reason,
            updatedAt: FieldValue.serverTimestamp(),
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  });
