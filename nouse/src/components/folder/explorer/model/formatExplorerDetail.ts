import { toMillis } from "@/utils/toMillis";



const pad2 = (value: number): string => {
  return String(value).padStart(2, "0");
};
const formatExplorerUpdatedAt = (value: unknown): string => {
  const millis = toMillis(value);
  if (!Number.isFinite(millis) || millis <= 0) return "—";

  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) return "—";

  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());

  return `${year}/${month}/${day} ${hours}:${minutes}`;
};
const formatExplorerSize = (bytes: number | null | undefined): string => {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) {
    return "—";
  }

  if (bytes < 1024) return `${bytes} B`;

  const units = ["KiB", "MiB", "GiB", "TiB"] as const;
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const fractionDigits = value >= 10 ? 1 : 2;
  return `${value.toFixed(fractionDigits)} ${units[unitIndex]}`;
};
const formatExplorerTags = (tags: string[]): string => {
  const normalizedTags = tags.map((tag) => tag.trim()).filter(Boolean).map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));

  return normalizedTags.length > 0 ? normalizedTags.join(" ") : "—";
};



export { formatExplorerUpdatedAt, formatExplorerSize, formatExplorerTags };
