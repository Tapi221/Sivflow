"use client";

import { cn } from "@web-renderer/lib/utils";

import type { VariantProps } from "class-variance-authority";

import { cva } from "class-variance-authority";

import type { PlateContentProps, PlateViewProps } from "platejs/react";

import { PlateContainer, PlateContent, PlateView } from "platejs/react";

import type * as React from "react";



type EditorProps = PlateContentProps & VariantProps<typeof editorVariants>;



const editorContainerVariants = cva(
  "relative w-full cursor-text select-text overflow-y-auto caret-foreground focus-visible:outline-none [&_.slate-selection-area]:z-50 [&_.slate-selection-area]:border [&_.slate-selection-area]:border-ring/30 [&_.slate-selection-area]:bg-muted-foreground/15",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        comment: cn(
          "flex flex-wrap justify-between gap-1 px-1 py-0.5 text-sm",
          "rounded-md border border-transparent bg-transparent",
          "has-[[data-slate-editor]:focus]:border-ring/50 has-[[data-slate-editor]:focus]:ring-2 has-[[data-slate-editor]:focus]:ring-ring/30",
          "has-aria-disabled:border-input has-aria-disabled:bg-muted",
        ),
        default: "h-full",
        demo: "h-dvh max-h-screen",
        select: cn(
          "group rounded-md border border-input ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          "has-data-readonly:w-fit has-data-readonly:cursor-default has-data-readonly:border-transparent has-data-readonly:focus-within:[box-shadow:none]",
        ),
      },
    },
  },
);

const editorVariants = cva(
  cn(
    "group/editor",
    "relative w-full cursor-text select-text overflow-x-hidden whitespace-pre-wrap break-words",
    "rounded-md ring-offset-background focus-visible:outline-none",
    "**:data-slate-placeholder:!top-1/2 **:data-slate-placeholder:-translate-y-1/2 placeholder:text-muted-foreground/80 **:data-slate-placeholder:text-muted-foreground/80 **:data-slate-placeholder:opacity-100!",
    "[&_strong]:font-bold",
  ),
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      disabled: {
        true: "cursor-not-allowed opacity-50",
      },
      focused: {
        true: "ring-2 ring-ring ring-offset-2",
      },
      variant: {
        ai: "w-full px-0 text-base md:text-sm",
        aiChat: "max-h-80 w-full overflow-y-auto px-3 py-2 text-base md:text-sm",
        comment: cn("rounded-none border-none bg-transparent text-sm"),
        default: "mx-auto size-full max-w-3xl px-6 pt-4 pb-72 text-base sm:px-16",
        demo: "mx-auto size-full max-w-3xl px-6 pt-4 pb-72 text-base sm:px-16",
        fullWidth: "size-full px-6 pt-4 pb-72 text-base sm:px-24",
        none: "",
        select: "px-3 py-2 text-base data-readonly:w-fit",
      },
    },
  },
);

const plateContentDomBlockedPropNames = [
  "decorate",
  "renderChunk",
  "renderElement",
  "renderLeaf",
  "renderText",
] as const;



const omitPlateContentDomBlockedProps = (props: PlateContentProps): PlateContentProps => {
  const nextProps = { ...props } as Record<string, unknown>;
  plateContentDomBlockedPropNames.forEach((propName) => {
    delete nextProps[propName];
  });
  return nextProps as PlateContentProps;
};

const omitPlateDomBlockedProps = <TProps extends Record<string, unknown>>(props: TProps): TProps => {
  const nextProps = { ...props };
  plateContentDomBlockedPropNames.forEach((propName) => {
    delete nextProps[propName];
  });
  return nextProps;
};



const EditorContainer = ({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof editorContainerVariants>) => {
  const containerProps = omitPlateDomBlockedProps(props);
  return <PlateContainer className={cn("ignore-click-outside/toolbar", editorContainerVariants({ variant }), className)} {...containerProps} />;
};

const Editor = ({ className, disabled, focused, variant, ref, ...props }: EditorProps & { ref?: React.RefObject<HTMLDivElement | null> }) => {
  const contentProps = omitPlateContentDomBlockedProps(props);
  return (
    <PlateContent
      ref={ref}
      className={cn(
        editorVariants({
          disabled,
          focused,
          variant,
        }),
        className,
      )}
      disabled={disabled}
      {...contentProps}
    />
  );
};

const EditorView = ({ className, variant, ...props }: PlateViewProps & VariantProps<typeof editorVariants>) => {
  const viewProps = omitPlateDomBlockedProps(props);
  return <PlateView {...viewProps} className={cn(editorVariants({ variant }), className)} />;
};



Editor.displayName = "Editor";

EditorView.displayName = "EditorView";

export { EditorContainer, Editor, EditorView };



export type { EditorProps };
