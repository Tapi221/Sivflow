declare module "react-arborist" {
  import type { ComponentType, ReactNode } from "react";

  export type NodeRendererProps<T> = {
    node: {
      id: string;
      data: T;
      isOpen: boolean;
      isSelected: boolean;
      isLeaf: boolean;
      toggle: () => void;
    };
    style: React.CSSProperties;
    dragHandle?: (element: HTMLElement | null) => void;
  };

  export type TreeProps<T> = {
    data?: T[];
    children?: ComponentType<NodeRendererProps<T>> | ReactNode;
    idAccessor?: keyof T | ((item: T) => string);
    childrenAccessor?: keyof T | ((item: T) => T[] | null | undefined);
    width?: number | string;
    height?: number;
    rowHeight?: number;
    indent?: number;
    openByDefault?: boolean;
    selection?: string;
    onSelect?: (nodes: Array<{ id: string; data: T; }>) => void;
    onActivate?: (node: { id: string; data: T; }) => void;
    className?: string;
  };

  export const Tree: <T>(props: TreeProps<T>) => React.ReactElement | null;
}
