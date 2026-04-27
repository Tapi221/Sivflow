import { formatExplorerTags } from "@/components/folder/explorer/model/formatExplorerDetail";

export const normalizeTagName = (tag: string): string => {
  return tag.replace(/^#+/, "").trim();
};

const toHashTagDisplayName = (tag: string): string => {
  const normalizedTagName = normalizeTagName(tag);
  return normalizedTagName ? `#${normalizedTagName}` : "";
};

export const parseTagEditorValue = (value: string): string[] => {
  const tagNames = value
    .split(/[\s,、]+/u)
    .map(normalizeTagName)
    .filter(Boolean);

  return Array.from(new Set(tagNames));
};

export const buildTagEditorValue = (tags: string[]): string => {
  return tags.map(toHashTagDisplayName).filter(Boolean).join(" ");
};

export const formatExplorerTagNames = (tags: string[]): string => {
  return formatExplorerTags(tags.map(toHashTagDisplayName).filter(Boolean));
};
