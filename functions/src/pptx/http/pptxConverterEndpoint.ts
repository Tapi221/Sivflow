import * as functions from "firebase-functions/v1";
import { executePlaceholderPptxConversion } from "../application/executePlaceholderPptxConversion";
import { getErrorCode, isPptxConversionError } from "../domain/errors";
import {
  CONVERTER_TOKEN_SECRET_ENV,
  asNonEmptyString,
  validateConverterToken,
} from "../security/guards";

type ConverterRequestBody = {
  userId?: string;
  docId?: string;
  sourceStoragePath?: string;
};

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

const extractProvidedToken = (req: functions.https.Request): string | null =>
  asNonEmptyString(req.header("x-pptx-converter-token"));

const validateRequestToken = (
  req: functions.https.Request,
  res: functions.Response,
): boolean => {
  const validation = validateConverterToken(
    process.env[CONVERTER_TOKEN_SECRET_ENV],
    extractProvidedToken(req),
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

const mapErrorToStatus = (error: unknown): number => {
  if (isPptxConversionError(error) && error.httpStatus !== undefined) {
    return error.httpStatus;
  }

  const code = getErrorCode(error);

  if (
    code === "invalid_payload" ||
    code === "source_scope_violation" ||
    code === "source_path_unsafe"
  ) {
    return 400;
  }

  if (code === "source_not_found") {
    return 404;
  }

  if (code === "converter_placeholder_disabled") {
    return 503;
  }

  return 500;
};

export const pptxConverterEndpoint = functions
  .runWith({ secrets: [CONVERTER_TOKEN_SECRET_ENV] })
  .https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "method_not_allowed" });
      return;
    }

    if (!validateRequestToken(req, res)) {
      return;
    }

    const body = parseBody(req);
    const userId = asNonEmptyString(body.userId);
    const docId = asNonEmptyString(body.docId);
    const sourceStoragePath = asNonEmptyString(body.sourceStoragePath);

    if (!userId || !docId || !sourceStoragePath) {
      res.status(400).json({ error: "invalid_payload" });
      return;
    }

    try {
      const result = await executePlaceholderPptxConversion({
        userId,
        docId,
        sourceStoragePath,
      });

      console.info("[PptxConverterEndpoint] conversion completed", {
        userId,
        docId,
        sourceStoragePath,
        manifestPath: result.manifestPath,
      });

      res.status(200).json(result);
    } catch (error) {
      const code = getErrorCode(error);

      console.error("[PptxConverterEndpoint] conversion failed", {
        userId,
        docId,
        sourceStoragePath,
        error,
      });

      res.status(mapErrorToStatus(error)).json({ error: code });
    }
  });
