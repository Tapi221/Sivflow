import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import {
  CONVERTER_TOKEN_SECRET_ENV,
  asNonEmptyString,
  isPlaceholderImplementationEnabled,
  isScopedStoragePath,
  validateConverterToken,
} from "./pptxConverterGuards";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

type ConverterRequestBody = {
  userId?: string;
  docId?: string;
  sourceStoragePath?: string;
};

type ManifestSlide = {
  index: number;
  path: string;
  width: number;
  height: number;
};

type ManifestPayload = {
  version: number;
  docId: string;
  userId: string;
  sourceStoragePath: string;
  slideCount: number;
  slides: ManifestSlide[];
  generatedAt: string;
};

const PNG_1PX_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOioAAAAASUVORK5CYII=";

const normalizePrefix = (value: string): string => (value.endsWith("/") ? value : `${value}/`);

const hasUnsafePathFragments = (value: string): boolean =>
  value.includes("..") || value.includes("\\") || value.includes("//");

const parseBody = (req: functions.https.Request): ConverterRequestBody => {
  if (req.body && typeof req.body === "object") {
    return req.body as ConverterRequestBody;
  }

  if (typeof req.body === "string" && req.body.trim().length > 0) {
    try {
      return JSON.parse(req.body) as ConverterRequestBody;
    } catch {
      return {};
    }
  }

  return {};
};

const requirePlaceholderEnabled = (res: functions.Response): boolean => {
  if (isPlaceholderImplementationEnabled()) return true;
  res.status(503).json({ error: "converter_placeholder_disabled" });
  return false;
};

const extractProvidedToken = (req: functions.https.Request): string | null =>
  asNonEmptyString(req.header("x-pptx-converter-token"));

const requireToken = (req: functions.https.Request, res: functions.Response): boolean => {
  const validation = validateConverterToken(
    process.env[CONVERTER_TOKEN_SECRET_ENV],
    extractProvidedToken(req)
  );

  if (validation === "misconfigured") {
    res.status(503).json({ error: "converter_token_misconfigured" });
    return false;
  }

  if (validation === "unauthorized") {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }

  return true;
};

export const pptxConverterEndpoint = functions
  .runWith({ secrets: [CONVERTER_TOKEN_SECRET_ENV] })
  .https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "method_not_allowed" });
      return;
    }

    if (!requirePlaceholderEnabled(res)) return;
    if (!requireToken(req, res)) return;

    const body = parseBody(req);
    const userId = asNonEmptyString(body.userId);
    const docId = asNonEmptyString(body.docId);
    const sourceStoragePath = asNonEmptyString(body.sourceStoragePath);

    if (!userId || !docId || !sourceStoragePath) {
      res.status(400).json({ error: "invalid_payload" });
      return;
    }

    if (!isScopedStoragePath(sourceStoragePath, userId, docId)) {
      res.status(400).json({ error: "source_scope_violation" });
      return;
    }

    if (hasUnsafePathFragments(sourceStoragePath)) {
      res.status(400).json({ error: "source_path_unsafe" });
      return;
    }

    const bucket = admin.storage().bucket();
    const destinationPrefix = normalizePrefix(`users/${userId}/documents/${docId}/pptx/`);

    try {
      const sourceFile = bucket.file(sourceStoragePath);
      const [sourceExists] = await sourceFile.exists();
      if (!sourceExists) {
        res.status(404).json({ error: "source_not_found" });
        return;
      }

      const slidePath = `${destinationPrefix}slides/slide-0001.png`;
      const manifestPath = `${destinationPrefix}manifest.json`;
      const slideBytes = Buffer.from(PNG_1PX_BASE64, "base64");

      await bucket.file(slidePath).save(slideBytes, {
        resumable: false,
        contentType: "image/png",
        metadata: {
          cacheControl: "public,max-age=31536000,immutable",
        },
      });

      const manifest: ManifestPayload = {
        version: 1,
        docId,
        userId,
        sourceStoragePath,
        slideCount: 1,
        slides: [
          {
            index: 1,
            path: slidePath,
            width: 1,
            height: 1,
          },
        ],
        generatedAt: new Date().toISOString(),
      };

      await bucket.file(manifestPath).save(JSON.stringify(manifest), {
        resumable: false,
        contentType: "application/json; charset=utf-8",
        metadata: {
          cacheControl: "no-cache",
        },
      });

      console.info("[PptxConverterEndpoint] conversion completed", {
        userId,
        docId,
        sourceStoragePath,
        manifestPath,
      });

      res.status(200).json({
        manifestPath,
        slideCount: 1,
        fallbackPdfPath: null,
      });
    } catch (error) {
      console.error("[PptxConverterEndpoint] conversion failed", {
        userId,
        docId,
        sourceStoragePath,
        error,
      });
      res.status(500).json({ error: "conversion_failed" });
    }
  });
