import type { ComponentType, CSSProperties, ReactElement, SVGProps } from "react";

declare global {
  type IconProps = SVGProps<SVGSVGElement> & {
    title?: string;
  };
}

declare module "react-arborist" {
  export type NodeRendererProps<T> = {
    node: {
      data: T;
      id: string;
      isOpen: boolean;
      isSelected: boolean;
      level: number;
      toggle: () => void;
      [key: string]: unknown;
    };
    style: CSSProperties;
    dragHandle?: (el: HTMLElement | null) => void;
  };

  export type TreeProps<T> = {
    data?: T[];
    children?: ComponentType<NodeRendererProps<T>>;
    idAccessor?: string | ((item: T) => string);
    childrenAccessor?: string | ((item: T) => T[] | null | undefined);
    openByDefault?: boolean;
    width?: number | string;
    height?: number;
    rowHeight?: number;
    indent?: number;
    overscanCount?: number;
    selection?: string;
    onSelect?: (nodes: Array<{ data: T; id: string; }>) => void;
    onActivate?: (node: { data: T; id: string; }) => void;
    [key: string]: unknown;
  };

  export const Tree: <T>(props: TreeProps<T>) => ReactElement | null;
}
