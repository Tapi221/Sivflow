"use client";

import * as React from "react";

import { SuggestionPlugin } from "@platejs/suggestion/react";

import { cva } from "class-variance-authority";

import { CornerDownLeftIcon } from "lucide-react";

import type { AnyPluginConfig, TElement, TSuggestionData, TSuggestionText, WithRequiredKey } from "platejs";

import { KEYS } from "platejs";

import type { PlateEditor, PlateLeafProps, RenderNodeWrapper } from "platejs/react";

import { PlateLeaf, useEditorPlugin, usePluginOption } from "platejs/react";

import { voidRemoveSuggestionOverlayVariants } from "./suggestion-node-static";

import type { SuggestionConfig } from "@/components/editor/plugins/suggestion-kit";

import { cn } from "@/lib/utils";



type BlockSuggestionWrapperOptions = {
  elementType?: string;
  isActive: boolean;
  isHover: boolean;
  isInsert: boolean;
  isRemove: boolean;
};

type VoidRemoveSuggestionOverlayProps = {
  editor: PlateEditor;
  element: TElement;
};

type SuggestionLineBreakAnchorProps = {
  badgeProps?: React.ComponentProps<"span">;
  children: React.ReactNode;
  className?: string;
};

type SuggestionLineBreakElementAnchorProps = {
  badgeProps?: React.ComponentProps<"span">;
  children: React.ReactElement<any>;
  className?: string;
};

type SuggestionLineBreakContentProps = {
  children: React.ReactNode;
  elementType?: string;
  suggestionData: TSuggestionData;
};



const suggestionPlugin = SuggestionPlugin as WithRequiredKey<SuggestionConfig>;

const suggestionVariants = cva(
  cn("bg-emerald-100 text-emerald-700 no-underline transition-colors duration-200"),
  {
    defaultVariants: {
      insertActive: false,
      remove: false,
      removeActive: false,
    },
    variants: {
      insertActive: {
        false: "",
        true: "bg-emerald-200/80",
      },
      remove: {
        false: "",
        true: "bg-red-100 text-red-700",
      },
      removeActive: {
        false: "",
        true: "bg-red-200/80 no-underline",
      },
    },
  },
);



const getBlockSuggestionWrapperClassName = ({ elementType, isActive, isHover, isInsert, isRemove }: BlockSuggestionWrapperOptions) => cn(
  elementType === KEYS.columnGroup && "flex size-full rounded",
  suggestionVariants({
    insertActive: isInsert && (isActive || isHover),
    remove: isRemove,
    removeActive: (isActive || isHover) && isRemove,
  }),
);

const isVoidRemoveSuggestion = (editor: PlateEditor, element: TElement) => editor.getApi(SuggestionPlugin).suggestion.suggestionData(element)?.type === "remove";

const createLineBreakBadgeProps = (setOption: (key: "activeId", value: string | null) => void, suggestionData: TSuggestionData) => ({
  onClick: (event: React.MouseEvent) => {
    event.stopPropagation();
    setOption("activeId", suggestionData.id);
  },
  onMouseDown: (event: React.MouseEvent) => {
    event.preventDefault();
  },
});



const VoidRemoveSuggestionOverlay = ({ editor, element }: VoidRemoveSuggestionOverlayProps) => {
  const active = editor.api.isVoid(element) && !editor.api.isInline(element) && isVoidRemoveSuggestion(editor, element);
  if (!active) {
    return null;
  }
  return (
    <div
      className={voidRemoveSuggestionOverlayVariants({ active })}
      contentEditable={false}
      data-slot="void-remove-suggestion"
    />
  );
};

const SuggestionLineBreakAnchor = ({ badgeProps, children, className }: SuggestionLineBreakAnchorProps) => {
  const badge = (
    <span
      {...badgeProps}
      className={cn(
        "inline-flex h-[calc(1lh+2px)] w-[1lh] shrink-0 items-center justify-center leading-none",
        badgeProps?.className,
        className,
      )}
      contentEditable={false}
    >
      <CornerDownLeftIcon className="relative top-px size-4" />
    </span>
  );
  return <>{children}{badge}</>;
};

const SuggestionLineBreakElementAnchor = ({ badgeProps, children, className }: SuggestionLineBreakElementAnchorProps) => {
  if (!React.isValidElement(children)) {
    return children;
  }
  const badge = (
    <span
      {...badgeProps}
      className={cn(
        "inline-flex h-[calc(1lh+2px)] w-[1lh] shrink-0 items-center justify-center leading-none",
        badgeProps?.className,
        className,
      )}
      contentEditable={false}
    >
      <CornerDownLeftIcon className="relative top-px size-4" />
    </span>
  );
  if (children.type === "ol" || children.type === "ul") {
    const childNodes = React.Children.toArray((children.props as { children?: React.ReactNode }).children);
    const lastIndex = childNodes.length - 1;
    const lastChild = childNodes[lastIndex];
    if (!React.isValidElement(lastChild) || lastChild.type !== "li") {
      return children;
    }
    const nextLastChild = React.cloneElement(lastChild as React.ReactElement<any>, {
      children: <>{(lastChild.props as { children?: React.ReactNode }).children}{badge}</>,
    });
    return React.cloneElement(children as React.ReactElement<any>, {
      children: [...childNodes.slice(0, lastIndex), nextLastChild],
    });
  }
  if (typeof children.type === "string") {
    return <>{children}{badge}</>;
  }
  return React.cloneElement(children as React.ReactElement<any>, { lineBreakBadge: badge });
};

const SuggestionLeaf = (props: PlateLeafProps<TSuggestionText>) => {
  const { api, setOption } = useEditorPlugin(suggestionPlugin);
  const leaf = props.leaf;
  const leafId = api.suggestion.nodeId(leaf) ?? "";
  const activeSuggestionId = usePluginOption(suggestionPlugin, "activeId");
  const hoverSuggestionId = usePluginOption(suggestionPlugin, "hoverId");
  const dataList = api.suggestion.dataList(leaf);
  const hasRemove = dataList.some((data) => data.type === "remove");
  const hasActive = dataList.some((data) => data.id === activeSuggestionId);
  const hasHover = dataList.some((data) => data.id === hoverSuggestionId);
  const diffOperation = { type: hasRemove ? "delete" : "insert" } as const;
  const Component = ({ delete: "del", insert: "ins", update: "span" } as const)[diffOperation.type];
  return (
    <PlateLeaf
      {...props}
      as={Component}
      attributes={{
        ...props.attributes,
        onMouseEnter: () => setOption("hoverId", leafId),
        onMouseLeave: () => setOption("hoverId", null),
      }}
      className={cn(
        suggestionVariants({
          insertActive: hasActive || hasHover,
          remove: hasRemove,
          removeActive: (hasActive || hasHover) && hasRemove,
        }),
      )}
    >
      {props.children}
    </PlateLeaf>
  );
};

const SuggestionLineBreakContent = ({ children, elementType, suggestionData }: SuggestionLineBreakContentProps) => {
  const { isLineBreak, type } = suggestionData;
  const isRemove = type === "remove";
  const isInsert = type === "insert";
  const activeSuggestionId = usePluginOption(suggestionPlugin, "activeId");
  const hoverSuggestionId = usePluginOption(suggestionPlugin, "hoverId");
  const isActive = activeSuggestionId === suggestionData.id;
  const isHover = hoverSuggestionId === suggestionData.id;
  const { setOption } = useEditorPlugin(suggestionPlugin);
  const lineBreakBadgeClassName = cn(
    isInsert && "bg-transparent! text-emerald-700! transition-colors duration-200",
    isInsert && (isActive || isHover) && "bg-transparent! text-emerald-700!",
    isRemove && "bg-transparent! text-red-700! transition-colors duration-200",
    isRemove && (isActive || isHover) && "bg-transparent! text-red-700!",
  );
  if (isLineBreak) {
    const badgeProps = createLineBreakBadgeProps(setOption, suggestionData);
    if (React.isValidElement(children) && typeof children.type !== "string") {
      return <SuggestionLineBreakElementAnchor badgeProps={badgeProps} className={lineBreakBadgeClassName}>{children}</SuggestionLineBreakElementAnchor>;
    }
    if (React.isValidElement(children) && (children.type === "ol" || children.type === "ul")) {
      return <SuggestionLineBreakElementAnchor badgeProps={badgeProps} className={lineBreakBadgeClassName}>{children}</SuggestionLineBreakElementAnchor>;
    }
    return <SuggestionLineBreakAnchor badgeProps={badgeProps} className={lineBreakBadgeClassName}>{children}</SuggestionLineBreakAnchor>;
  }
  return (
    <div
      className={getBlockSuggestionWrapperClassName({ elementType, isActive, isHover, isInsert, isRemove })}
      data-block-suggestion="true"
      onMouseEnter={() => setOption("hoverId", suggestionData.id)}
      onMouseLeave={() => setOption("hoverId", null)}
    >
      {children}
    </div>
  );
};

const SuggestionLineBreak: RenderNodeWrapper<AnyPluginConfig> = ({ api, element }) => {
  if (!api.suggestion.isBlockSuggestion(element)) {
    return;
  }
  const suggestionData = element.suggestion as TSuggestionData;
  return ({ children }) => (
    <SuggestionLineBreakContent elementType={element.type} suggestionData={suggestionData}>
      {children}
    </SuggestionLineBreakContent>
  );
};



export { SuggestionLeaf, SuggestionLineBreak, SuggestionLineBreakAnchor, SuggestionLineBreakContent, VoidRemoveSuggestionOverlay, getBlockSuggestionWrapperClassName, isVoidRemoveSuggestion, suggestionVariants };
