type DateLike = {
  toDate?: unknown;
};
type BlobUrlFix = {
  path: string;
  before: string;
};
type SanitizeResult<T> = {
  value: T;
  changed: boolean;
  fixes: BlobUrlFix[];
};



const isBlobUrl = (v: unknown): v is string => typeof v === "string" && v.startsWith("blob:");
const sanitizeBlobUrlsDeep = <T>(input: T): SanitizeResult<T> => {
  const fixes: BlobUrlFix[] = [];

  const shouldPreserveObject = (value: unknown): boolean => {
    if (!value || typeof value !== "object") return false;
    if (value instanceof Date) return true;
    if (typeof (value as DateLike).toDate === "function") return true;
    const proto = Object.getPrototypeOf(value);
    return proto !== Object.prototype && proto !== null;
  };

  const visit = (value: unknown, path: string): unknown => {
    if (isBlobUrl(value)) {
      fixes.push({ path, before: value });
      return null;
    }
    if (Array.isArray(value)) {
      return value.map((entry, index) => visit(entry, `${path}[${index}]`));
    }
    if (value && typeof value === "object") {
      if (shouldPreserveObject(value)) return value;
      const out: Record<string, unknown> = {};
      for (const [key, nested] of Object.entries(
        value as Record<string, unknown>,
      )) {
        const childPath = path ? `${path}.${key}` : key;
        out[key] = visit(nested, childPath);
      }
      return out;
    }
    return value;
  };

  const value = visit(input, "") as T;
  return {
    value,
    changed: fixes.length > 0,
    fixes,
  };
};
const findBlobUrlFixesDeep = (input: unknown) => {
  return sanitizeBlobUrlsDeep(input).fixes;
};



export { isBlobUrl, sanitizeBlobUrlsDeep, findBlobUrlFixesDeep };


export type { BlobUrlFix, SanitizeResult };
