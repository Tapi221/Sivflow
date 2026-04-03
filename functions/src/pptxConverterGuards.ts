export const PRIMARY_CONVERTER_ENDPOINT_ENV = "PPTX_CONVERTER_ENDPOINT";
export const LEGACY_CONVERTER_ENDPOINT_ENV = "PPTX_CONVERSION_ENDPOINT";
export const CONVERTER_TOKEN_SECRET_ENV = "PPTX_CONVERTER_TOKEN";
export const CONVERTER_IMPLEMENTATION_ENV = "PPTX_CONVERTER_IMPLEMENTATION";
export const CONVERTER_PLACEHOLDER_ENABLED_ENV =
  "PPTX_CONVERTER_PLACEHOLDER_ENABLED";

const PLACEHOLDER_IMPLEMENTATION = "placeholder";
const REAL_IMPLEMENTATION = "real";

export type ConverterTokenValidation = "ok" | "misconfigured" | "unauthorized";

export const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildDocumentPathPrefix = (userId: string, docId: string): string =>
  `users/${userId}/documents/${docId}/`;

export const isScopedStoragePath = (
  path: string,
  userId: string,
  docId: string,
): boolean => path.startsWith(buildDocumentPathPrefix(userId, docId));

const normalizeEnabledFlag = (value: string | null): boolean => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
};

export const isPlaceholderImplementationEnabled = (
  env: NodeJS.ProcessEnv = process.env,
): boolean => {
  const implementation = asNonEmptyString(
    env[CONVERTER_IMPLEMENTATION_ENV],
  )?.toLowerCase();

  if (implementation === PLACEHOLDER_IMPLEMENTATION) return true;
  if (implementation === REAL_IMPLEMENTATION) return false;

  return normalizeEnabledFlag(
    asNonEmptyString(env[CONVERTER_PLACEHOLDER_ENABLED_ENV]),
  );
};

export const validateConverterToken = (
  configuredTokenRaw: unknown,
  providedTokenRaw: unknown,
): ConverterTokenValidation => {
  const configuredToken = asNonEmptyString(configuredTokenRaw);
  if (!configuredToken) return "misconfigured";

  const providedToken = asNonEmptyString(providedTokenRaw);
  if (!providedToken || providedToken !== configuredToken)
    return "unauthorized";

  return "ok";
};

export const resolveConverterEndpointFromEnv = (
  env: NodeJS.ProcessEnv = process.env,
): string => {
  const primary = asNonEmptyString(env[PRIMARY_CONVERTER_ENDPOINT_ENV]);
  const legacy = asNonEmptyString(env[LEGACY_CONVERTER_ENDPOINT_ENV]);

  if (primary && legacy && primary !== legacy) {
    console.warn(
      `[PptxConversion] Both ${PRIMARY_CONVERTER_ENDPOINT_ENV} and ${LEGACY_CONVERTER_ENDPOINT_ENV} are set. Using ${PRIMARY_CONVERTER_ENDPOINT_ENV}.`,
    );
    return primary;
  }

  if (!primary && legacy) {
    console.warn(
      `[PptxConversion] ${LEGACY_CONVERTER_ENDPOINT_ENV} is deprecated. Please migrate to ${PRIMARY_CONVERTER_ENDPOINT_ENV}.`,
    );
    return legacy;
  }

  return primary ?? "";
};
