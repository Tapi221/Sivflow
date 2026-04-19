import "@xyflow/react/dist/style.css";

import { TagBadge } from "@/components/tag/TagBadge";
import { cn } from "@/lib/utils";
import { HelpCircle, Star } from "@/ui/icons";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import { memo, useMemo } from "react";

import { buildDirectoryMindMapGraph } from "./buildDirectoryMindMapGraph";
import type {
  DirectoryBadgeVisibility,
  DirectoryMindMapNodeData,
  DirectoryTreeNode,
} from "./directoryTypes";

const HANDLE_CLASS_NAME = "!h-2 !w-2 !border-0 !bg-transparent";

type DirectoryFolderFlowNodeType = Node<
  DirectoryMindMapNodeData,
  "directoryFolderNode"
>;
type DirectoryRootFlowNodeType = Node<
  DirectoryMindMapNodeData,
  "directoryRootNode"
>;

const DirectoryMindMapChip = ({
  chip,
  badgeVisibility,
  getTagColor,
  onCardClick,
}: {
  chip: DirectoryMindMapNodeData["chips"][number];
  badgeVisibility: DirectoryBadgeVisibility;
  getTagColor: (tagNameOrId: string) => string;
  onCardClick: (cardId: string) => void;
}) => {
  const isCardNode =
    chip.kind === "card" && typeof chip.sourceCardId === "string";

  const content = (
    <>
      <span className="max-w-[180px] truncate">{chip.label}</span>

      {badgeVisibility.uncertainty && chip.hasUncertainty ? (
        <HelpCircle className="h-3.5 w-3.5 shrink-0 text-slate-500" />
      ) : null}

      {badgeVisibility.bookmarked && chip.isBookmarked ? (
        <Star className="h-3.5 w-3.5 shrink-0 fill-current text-amber-500" />
      ) : null}

      {badgeVisibility.tags && chip.showTags
        ? chip.tags
            .slice(0, 2)
            .map((tag) => (
              <TagBadge
                key={`${chip.id}:${tag}`}
                label={tag}
                size="xs"
                colorClass={getTagColor(tag)}
                className="shrink-0 align-middle"
              />
            ))
        : null}

      {badgeVisibility.tags && chip.showTags && chip.tags.length > 2 ? (
        <span className="text-[10px] text-slate-400">
          +{chip.tags.length - 2}
        </span>
      ) : null}
    </>
  );

  const className = cn(
    "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs leading-5 transition-colors",
    isCardNode
      ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      : "border-slate-200 bg-slate-100 text-slate-600",
  );

  if (isCardNode) {
    return (
      <button
        type="button"
        onClick={() => {
          if (chip.sourceCardId) {
            onCardClick(chip.sourceCardId);
          }
        }}
        className={cn(
          className,
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
        )}
      >
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
};

const DirectoryFolderFlowNode = memo(
  ({ data }: NodeProps<DirectoryFolderFlowNodeType>) => {
    const innerPosition = data.side === "left" ? Position.Right : Position.Left;
    const outerPosition = data.side === "left" ? Position.Left : Position.Right;

    return (
      <div className="w-[280px] rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm">
        <Handle
          id="inner"
          type="target"
          position={innerPosition}
          className={HANDLE_CLASS_NAME}
        />
        <Handle
          id="outer"
          type="source"
          position={outerPosition}
          className={HANDLE_CLASS_NAME}
        />

        <div className="break-words text-sm font-semibold leading-6 text-slate-800">
          {data.label}
        </div>

        {data.chips.length > 0 || data.hiddenChipCount > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {data.chips.map((chip) => (
              <DirectoryMindMapChip
                key={chip.id}
                chip={chip}
                badgeVisibility={data.badgeVisibility}
                getTagColor={data.getTagColor}
                onCardClick={data.onCardClick}
              />
            ))}

            {data.hiddenChipCount > 0 ? (
              <div className="inline-flex items-center rounded-full border border-dashed border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500">
                +{data.hiddenChipCount}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
          {data.folderCount > 0 ? (
            <span className="rounded-full bg-slate-100 px-2 py-1">
              子フォルダ {data.folderCount}
            </span>
          ) : null}

          {data.itemCount > 0 ? (
            <span className="rounded-full bg-slate-100 px-2 py-1">
              項目 {data.itemCount}
            </span>
          ) : null}
        </div>
      </div>
    );
  },
);

const DirectoryRootFlowNode = memo(
  ({ data }: NodeProps<DirectoryRootFlowNodeType>) => {
    return (
      <div className="rounded-full border border-slate-300 bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-md">
        <Handle
          id="left"
          type="source"
          position={Position.Left}
          className={HANDLE_CLASS_NAME}
        />
        <Handle
          id="right"
          type="source"
          position={Position.Right}
          className={HANDLE_CLASS_NAME}
        />
        {data.label}
      </div>
    );
  },
);

const nodeTypes: NodeTypes = {
  directoryFolderNode: DirectoryFolderFlowNode,
  directoryRootNode: DirectoryRootFlowNode,
};

export const DirectoryMindMapCanvas = ({
  rootNodes,
  getTagColor,
  badgeVisibility,
  onCardClick,
}: {
  rootNodes: DirectoryTreeNode[];
  getTagColor: (tagNameOrId: string) => string;
  badgeVisibility: DirectoryBadgeVisibility;
  onCardClick: (cardId: string) => void;
}) => {
  const { nodes, edges } = useMemo(
    () =>
      buildDirectoryMindMapGraph({
        rootNodes,
        getTagColor,
        badgeVisibility,
        onCardClick,
      }),
    [badgeVisibility, getTagColor, onCardClick, rootNodes],
  );

  return (
    <div className="h-[calc(100vh-230px)] min-h-[720px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white/55">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.25}
        maxZoom={1.8}
        nodeOrigin={[0.5, 0.5]}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: "default",
          style: {
            stroke: "rgba(148, 163, 184, 0.75)",
            strokeWidth: 1.5,
          },
        }}
      >
        <Background gap={24} size={1} color="rgba(148, 163, 184, 0.22)" />
        <Controls
          position="bottom-right"
          showInteractive={false}
          className="!shadow-sm"
        />
      </ReactFlow>
    </div>
  );
};
