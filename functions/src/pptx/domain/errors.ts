const ERROR_MESSAGE_LIMIT = 400;

export type PptxConversionError = Error & {
  code: string;
  httpStatus?: number;
};

export const createPptxConversionError = (
  code: string,
  httpStatus?: number,
  message?: string,
): PptxConversionError => {
  const error = new Error(message ?? code) as PptxConversionError;
  error.name = "PptxConversionError";
  error.code = code;

  if (httpStatus !== undefined) {
    error.httpStatus = httpStatus;
  }

  return error;
};

export const isPptxConversionError = (
  error: unknown,
): error is PptxConversionError => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return typeof (error as { code?: unknown }).code === "string";
};

export const getErrorCode = (error: unknown): string => {
  if (isPptxConversionError(error)) {
    return error.code;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error.trim();
  }

  const maybeMessage = (error as { message?: unknown } | null)?.message;
  if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
    return maybeMessage.trim();
  }

  return "unknown_error";
};

export const toSafeErrorMessage = (
  error: unknown,
  limit: number = ERROR_MESSAGE_LIMIT,
): string => {
  if (!error) {
    return "unknown_error";
  }

  if (typeof error === "string") {
    return error.slice(0, limit);
  }

  const codePrefix = isPptxConversionError(error) ? `${error.code}:` : "";
  const maybeName = (error as { name?: unknown } | null)?.name;
  const maybeMessage =
    (error as { message?: unknown } | null)?.message ?? JSON.stringify(error);

  const namePrefix =
    typeof maybeName === "string" && maybeName.length > 0 ? `${maybeName}: ` : "";

  return `${codePrefix}${namePrefix}${String(maybeMessage)}`.slice(0, limit);
};
