import React, { useEffect, useMemo, useRef, useState } from "react";
import { Tree } from "react-arborist";
import type { NodeApi, TreeApi, MoveHandler } from "react-arborist";
import { FOLDER_ROW_HEIGHT_PX } from "@/components/folder/explorer/rows/shared";

export type FolderTreeArboristNode = {
  id: string;
  name: string;
  children?: FolderTreeArboristNode[];
};

type RenderArgs<T extends FolderTreeArboristNode> = {
  isOpen: boolean;
  isSelected: boolean;
  node: NodeApi<T>;
  style: React.CSSProperties;
  toggle: () => void;
};

type Props<T extends FolderTreeArboristNode> = {
  data: T[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  expandedIds?: string[];
  onToggleExpand?: (id: string, nextOpen: boolean) => void;
  renderNode: (args: RenderArgs<T>) => React.ReactNode;
  onMove?: MoveHandler<T>;
  disableDrag?: boolean | ((node: NodeApi<T>) => boolean);
  disableDrop?:
    | boolean
    | ((args: {
        parentNode: NodeApi<T>;
        dragNodes: NodeApi<T>[];
        index: number;
      }) => boolean);
};

export function FolderTreeArborist<T extends FolderTreeArboristNode>({
  data,
  selectedId,
  onSelect,
  expandedIds,
  onToggleExpand,
  renderNode,
  onMove,
  disableDrag = true,
  disableDrop = true,
}: Props<T>) {
  const rowHeight = FOLDER_ROW_HEIGHT_PX;
  const indent = 12;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const treeRef = useRef<TreeApi<T> | null>(null);
  const selectedIdRef = useRef<string | null | undefined>(selectedId);
  const [height, setHeight] = useState(300);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let rafId = 0;

    const ro = new ResizeObserver(() => {
      const nextHeight = el.clientHeight;
      if (nextHeight > 0) setHeight(nextHeight);
    });

    ro.observe(el);
    rafId = window.requestAnimationFrame(() => {
      const nextHeight = el.clientHeight;
      if (nextHeight > 0) setHeight(nextHeight);
    });

    return () => {
      ro.disconnect();
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  const initialOpenState = useMemo(
    () =>
      Object.fromEntries((expandedIds ?? []).map((id) => [id, true] as const)),
    [expandedIds],
  );

  useEffect(() => {
    const tree = treeRef.current;
    if (!tree || !expandedIds) return;

    const expandedSet = new Set(expandedIds);

    const syncNode = (node: NodeApi<T>) => {
      if (!node.isLeaf) {
        const shouldOpen = expandedSet.has(node.id);
        if (shouldOpen && !node.isOpen) tree.open(node.id);
        if (!shouldOpen && node.isOpen) tree.close(node.id);
      }

      node.children?.forEach(syncNode);
    };

    tree.root.children?.forEach(syncNode);
  }, [expandedIds, data]);

  useEffect(() => {
    const tree = treeRef.current;
    if (!tree || data.length === 0) return;

    const targetId = selectedIdRef.current ?? data[0]?.id;
    if (!targetId) return;

    // Prevent stale virtual-list scroll offset from hiding rows on remount/tab switch.
    // Do not run on every selection change, otherwise switching cards forces scrolling.
    tree.scrollTo(targetId, "start");
  }, [data]);

  return (
    <div ref={containerRef} className="h-full min-h-0">
      <Tree<T>
        ref={treeRef}
        data={data}
        width="100%"
        height={height}
        rowHeight={rowHeight}
        indent={indent}
        selection={selectedId ?? undefined}
        initialOpenState={initialOpenState}
        onMove={onMove}
        disableDrag={disableDrag}
        disableDrop={disableDrop}
        disableEdit
        openByDefault={false}
        onSelect={(nodes) => {
          const first = nodes?.[0];
          if (first) onSelect?.(first.id);
        }}
      >
        {({ node, style }) =>
          renderNode({
            node,
            style,
            isOpen: node.isOpen,
            isSelected: node.id === selectedId,
            toggle: () => {
              const nextOpen = !node.isOpen;

              if (expandedIds && onToggleExpand) {
                onToggleExpand(node.id, nextOpen);
                return;
              }

              node.toggle();
            },
          })
        }
      </Tree>
    </div>
  );
}




