import type { BlockConfig } from "@/types/domain/base";

export type EditorBlockType = Extract<
  BlockConfig["type"],
  "text" | "question" | "code" | "image" | "math" | "markdown" | "pdf"
>;

export type EditorBlockIconName =
  | "Type"
  | "HelpCircle"
  | "Code"
  | "Image"
  | "Sigma"
  | "NotebookPen"
  | "FileText";

export type EditorBlockDefinition = Readonly<{
  id: EditorBlockType;
  type: EditorBlockType;
  label: string;
  icon: EditorBlockIconName;
  isVisible: boolean;
  orderIndex: number;
}>;

export type EditorBlockConfig = Omit<BlockConfig, "id" | "type"> & {
  id: EditorBlockType;
  type: EditorBlockType;
};

type EditorBlockComparable = Pick<BlockConfig, "type" | "orderIndex">;

const EDITOR_BLOCK_DEFINITIONS = [
  {
    id: "text",
    type: "text",
    label: "テキスト",
    icon: "Type",
    isVisible: true,
    orderIndex: 0,
  },
  {
    id: "question",
    type: "question",
    label: "疑問",
    icon: "HelpCircle",
    isVisible: true,
    orderIndex: 1,
  },
  {
    id: "code",
    type: "code",
    label: "コード",
    icon: "Code",
    isVisible: true,
    orderIndex: 2,
  },
  {
    id: "image",
    type: "image",
    label: "画像",
    icon: "Image",
    isVisible: true,
    orderIndex: 3,
  },
  {
    id: "math",
    type: "math",
    label: "数式",
    icon: "Sigma",
    isVisible: true,
    orderIndex: 4,
  },
  {
    id: "markdown",
    type: "markdown",
    label: "Markdown",
    icon: "NotebookPen",
    isVisible: true,
    orderIndex: 5,
  },
  {
    id: "pdf",
    type: "pdf",
    label: "PDF",
    icon: "FileText",
    isVisible: true,
    orderIndex: 6,
  },
] as const satisfies readonly EditorBlockDefinition[];

const EDITOR_BLOCK_DEFINITION_BY_TYPE = Object.fromEntries(
  EDITOR_BLOCK_DEFINITIONS.map(
    (definition) => [definition.type, definition] as const,
  ),
) as Record<EditorBlockType, EditorBlockDefinition>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const createEditorBlockConfigFromDefinition = (
  definition: EditorBlockDefinition,
): EditorBlockConfig => ({
  id: definition.id,
  type: definition.type,
  label: definition.label,
  isVisible: definition.isVisible,
  orderIndex: definition.orderIndex,
});

const getFallbackOrderIndex = (type: EditorBlockType) => {
  return EDITOR_BLOCK_DEFINITION_BY_TYPE[type].orderIndex;
};

const compareEditorBlockConfigs = (
  left: EditorBlockComparable,
  right: EditorBlockComparable,
) => {
  if (!isEditorBlockType(left.type) || !isEditorBlockType(right.type)) {
    return 0;
  }

  const orderDiff = left.orderIndex - right.orderIndex;
  if (orderDiff !== 0) {
    return orderDiff;
  }

  return getFallbackOrderIndex(left.type) - getFallbackOrderIndex(right.type);
};

export const isEditorBlockType = (value: unknown): value is EditorBlockType => {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(EDITOR_BLOCK_DEFINITION_BY_TYPE, value)
  );
};

export const getEditorBlockDefinition = (
  type: EditorBlockType,
): EditorBlockDefinition => {
  return EDITOR_BLOCK_DEFINITION_BY_TYPE[type];
};

export const createDefaultEditorBlockSettings = (): EditorBlockConfig[] => {
  return EDITOR_BLOCK_DEFINITIONS.map(createEditorBlockConfigFromDefinition);
};

export const normalizeEditorBlockSettings = (
  items:
    | readonly EditorBlockConfig[]
    | readonly BlockConfig[]
    | null
    | undefined,
): EditorBlockConfig[] => {
  const byType = new Map<EditorBlockType, EditorBlockConfig>();
  const sortedItems = [...(items ?? [])].sort(compareEditorBlockConfigs);

  for (const item of sortedItems) {
    if (!isEditorBlockType(item.type) || byType.has(item.type)) {
      continue;
    }

    const definition = getEditorBlockDefinition(item.type);

    byType.set(item.type, {
      id: definition.id,
      type: definition.type,
      label: definition.label,
      isVisible:
        typeof item.isVisible === "boolean"
          ? item.isVisible
          : definition.isVisible,
      orderIndex:
        typeof item.orderIndex === "number" && Number.isFinite(item.orderIndex)
          ? item.orderIndex
          : definition.orderIndex,
    });
  }

  const merged = EDITOR_BLOCK_DEFINITIONS.map((definition) => {
    return (
      byType.get(definition.type) ??
      createEditorBlockConfigFromDefinition(definition)
    );
  });

  return merged
    .sort(compareEditorBlockConfigs)
    .map((block, index) => ({ ...block, orderIndex: index }));
};

export const parseEditorBlockSettings = (
  input: readonly unknown[] | null | undefined,
): EditorBlockConfig[] => {
  const parsedItems: EditorBlockConfig[] = [];

  for (const value of input ?? []) {
    if (!isRecord(value) || !isEditorBlockType(value["type"])) {
      continue;
    }

    const definition = getEditorBlockDefinition(value["type"]);
    const labelValue = value["label"];
    const isVisibleValue = value["isVisible"];
    const enabledValue = value["enabled"];
    const orderIndexValue = value["orderIndex"];

    parsedItems.push({
      id: definition.id,
      type: definition.type,
      label:
        typeof labelValue === "string" && labelValue.trim().length > 0
          ? labelValue
          : definition.label,
      isVisible:
        typeof isVisibleValue === "boolean"
          ? isVisibleValue
          : typeof enabledValue === "boolean"
            ? enabledValue
            : definition.isVisible,
      orderIndex:
        typeof orderIndexValue === "number" && Number.isFinite(orderIndexValue)
          ? orderIndexValue
          : definition.orderIndex,
    });
  }

  return normalizeEditorBlockSettings(parsedItems);
};
