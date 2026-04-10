import { GoogleAuth, IdTokenClient } from "google-auth-library";
import { ExternalConversionResult } from "../../domain/conversionTypes";
import { createPptxConversionError, getErrorCode } from "../../domain/errors";
import {
  CONVERTER_TOKEN_SECRET_ENV,
  asNonEmptyString,
  resolveConverterEndpointFromEnv,
} from "../../security/guards";

const CONVERTER_REQUEST_TIMEOUT_MS = 15000;
const ENDPOINT_FALLBACK_ERROR_CODES = new Set([
  "converter_placeholder_disabled",
  "converter_token_misconfigured",
]);

const auth = new GoogleAuth();
const idTokenClientCache = new Map<string, Promise<IdTokenClient>>();

const getConverterToken = (): string => {
  const token = asNonEmptyString(process.env[CONVERTER_TOKEN_SECRET_ENV]);

  if (!token) {
    throw createPptxConversionError("converter_token_not_configured");
  }

  return token;
};

const getIdTokenClient = (audience: string): Promise<IdTokenClient> => {
  const cached = idTokenClientCache.get(audience);
  if (cached) {
    return cached;
  }

  const created = auth.getIdTokenClient(audience);
  idTokenClientCache.set(audience, created);
  return created;
};

const parseConverterErrorPayload = async (
  response: Response,
): Promise<string | null> => {
  const contentType = response.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const parsed = (await response.json()) as Record<string, unknown>;
      return (
        asNonEmptyString(parsed.error) ??
        asNonEmptyString(parsed.message) ??
        null
      );
    }

    const text = await response.text();
    return asNonEmptyString(text);
  } catch {
    return null;
  }
};

export const isEndpointUnavailableError = (error: unknown): boolean => {
  const code = getErrorCode(error);

  if (code === "converter_token_not_configured") {
    return true;
  }

  if (!code.startsWith("converter_http_503")) {
    return false;
  }

  for (const fallbackCode of ENDPOINT_FALLBACK_ERROR_CODES) {
    if (code.includes(`:${fallbackCode}`)) {
      return true;
    }
  }

  return false;
};

export const requestExternalConversion = async ({
  userId,
  docId,
  sourceStoragePath,
}: {
  userId: string;
  docId: string;
  sourceStoragePath: string;
}): Promise<ExternalConversionResult> => {
  const endpoint = resolveConverterEndpointFromEnv();

  if (!endpoint) {
    throw createPptxConversionError("converter_endpoint_not_configured");
  }

  const token = getConverterToken();
  const endpointUrl = new URL(endpoint);
  const audience = endpointUrl.origin;
  const idTokenClient = await getIdTokenClient(audience);
  const idTokenHeaders = await idTokenClient.getRequestHeaders(audience);

  const authorization = asNonEmptyString(
    (idTokenHeaders as Record<string, unknown>).Authorization ??
      (idTokenHeaders as Record<string, unknown>).authorization,
  );

  if (!authorization) {
    throw createPptxConversionError("converter_id_token_missing");
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, CONVERTER_REQUEST_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
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
    if ((error as { name?: string } | null)?.name === "AbortError") {
      throw createPptxConversionError(
        `converter_timeout_${CONVERTER_REQUEST_TIMEOUT_MS}ms`,
      );
    }

    throw createPptxConversionError("converter_http_503:network_error");
  } finally {
    clearTimeout(timeoutHandle);
  }

  if (!response.ok) {
    const converterError = await parseConverterErrorPayload(response);
    const statusDetail = converterError ? `:${converterError}` : "";
    throw createPptxConversionError(
      `converter_http_${response.status}${statusDetail}`,
    );
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const manifestPath = asNonEmptyString(payload.manifestPath);

  if (!manifestPath) {
    throw createPptxConversionError("converter_response_missing_manifestPath");
  }

  return {
    manifestPath,
    slideCount:
      typeof payload.slideCount === "number" &&
      Number.isFinite(payload.slideCount)
        ? payload.slideCount
        : null,
    fallbackPdfPath: asNonEmptyString(payload.fallbackPdfPath),
  };
};
