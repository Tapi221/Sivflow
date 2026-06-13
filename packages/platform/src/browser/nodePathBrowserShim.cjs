const normalizePathInput = (value) => String(value ?? "");
const trimTrailingSeparators = (value) => value.replace(/\\/+$/u, "");
const basename = (value, suffix = "") => {
  const normalized = trimTrailingSeparators(normalizePathInput(value));
  const slashIndex = normalized.lastIndexOf("/");
  const base = slashIndex < 0 ? normalized : normalized.slice(slashIndex + 1);
  return suffix && base.endsWith(suffix) ? base.slice(0, -suffix.length) : base;
};
const dirname = (value) => {
  const normalized = trimTrailingSeparators(normalizePathInput(value));
  if (!normalized) return ".";
  const slashIndex = normalized.lastIndexOf("/");
  if (slashIndex < 0) return ".";
  if (slashIndex === 0) return "/";
  return normalized.slice(0, slashIndex);
};
const extname = (value) => {
  const base = basename(value);
  const dotIndex = base.lastIndexOf(".");
  if (dotIndex <= 0) return "";
  return base.slice(dotIndex);
};
const join = (...parts) => parts.filter((part) => normalizePathInput(part).length > 0).join("/").replace(/\/+/gu, "/");
const resolve = (...parts) => {
  const joined = join(...parts);
  return joined.startsWith("/") ? joined : `/${joined}`;
};
module.exports = { basename, dirname, extname, join, resolve };
