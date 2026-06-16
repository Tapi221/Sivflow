"use client";

import * as React from "react";

import { useEquationElement, useEquationInput } from "@platejs/math/react";

import { BlockSelectionPlugin } from "@platejs/selection/react";

import { Button } from "@web-renderer/chip/button/button/button";

import { inlineSuggestionVariants } from "./suggestion";

import { Popover, PopoverContent, PopoverTrigger } from "@web-renderer/chip/ui/popover";

import { cn } from "@web-renderer/lib/utils";

import { CornerDownLeftIcon, RadicalIcon } from "lucide-react";

import type { TEquationElement } from "platejs";

import type { PlateElementProps } from "platejs/react";

import { createPrimitiveComponent, PlateElement, useEditorRef, useEditorSelector, useElement, useReadOnly, useSelected } from "platejs/react";

import type { TextareaAutosizeProps } from "react-textarea-autosize";

import TextareaAutosize from "react-textarea-autosize";



type EquationPopoverContentProps = {
  isInline: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
} & TextareaAutosizeProps;

type EquationElementWithBadgeProps = PlateElementProps<TEquationElement> & {
  lineBreakBadge?: React.ReactNode;
};



const EQUATION_RENDER_OPTIONS = {
  displayMode: true,
  errorColor: "#c00",
  fleqn: false,
  leqno: false,
  macros: { "\f": "#1f(#2)" },
  output: "htmlAndMathml" as const,
  strict: "warn" as const,
  throwOnError: false,
  trust: false,
};

const EquationInput = createPrimitiveComponent(TextareaAutosize)({
  propsHook: useEquationInput,
});



const EquationPopoverContent = ({ className, isInline, open, setOpen, ...props }: EquationPopoverContentProps) => {
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const element = useElement<TEquationElement>();
  React.useEffect(() => {
    if (isInline && open) {
      setOpen(true);
    }
  }, [isInline, open, setOpen]);
  if (readOnly) {
    return null;
  }
  const onClose = () => {
    setOpen(false);
    if (isInline) {
      editor.tf.select(element, { focus: true, next: true });
      return;
    }
    editor.getApi(BlockSelectionPlugin).blockSelection.set(element.id as string);
  };
  return (
    <PopoverContent
      className="flex gap-2"
      contentEditable={false}
      onEscapeKeyDown={(event) => {
        event.preventDefault();
      }}
    >
      <EquationInput
        autoFocus
        className={cn("max-h-96 grow resize-none p-2 text-sm", className)}
        state={{ isInline, onClose, open }}
        {...props}
      />
      <Button className="px-3" variant="secondary" onClick={onClose}>
        Done <CornerDownLeftIcon className="size-3.5" />
      </Button>
    </PopoverContent>
  );
};

const EquationElement = (props: PlateElementProps<TEquationElement>) => {
  const selected = useSelected();
  const [open, setOpen] = React.useState(selected);
  const katexRef = React.useRef<HTMLDivElement | null>(null);
  const lineBreakBadge = (props as EquationElementWithBadgeProps).lineBreakBadge;
  useEquationElement({
    element: props.element,
    katexRef,
    options: EQUATION_RENDER_OPTIONS,
  });
  return (
    <PlateElement className="my-1" {...props}>
      <Popover modal={false} open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            className={cn(
              "group flex cursor-pointer select-none items-center justify-center rounded-sm hover:bg-muted/60 data-[selected=true]:bg-muted/60",
              props.element.texExpression.length === 0 ? "bg-muted p-3 pr-9" : "px-2 py-1",
            )}
            contentEditable={false}
            data-selected={selected}
            role="button"
          >
            {props.element.texExpression.length > 0 ? (
              <span ref={katexRef} />
            ) : (
              <div className="flex h-7 w-full items-center gap-2 whitespace-nowrap text-muted-foreground text-sm">
                <RadicalIcon className="size-6 text-muted-foreground/80" />
                Add a Tex equation
              </div>
            )}
            {lineBreakBadge}
          </div>
        </PopoverTrigger>
        <EquationPopoverContent
          isInline={false}
          open={open}
          placeholder={String.raw`f(x) = \begin{cases}
  x^2, &\quad x > 0 \\
  0, &\quad x = 0 \\
  -x^2, &\quad x < 0
\end{cases}`}
          setOpen={setOpen}
        />
      </Popover>
      {props.children}
    </PlateElement>
  );
};

const InlineEquationElement = (props: PlateElementProps<TEquationElement>) => {
  const { element } = props;
  const katexRef = React.useRef<HTMLDivElement | null>(null);
  const selected = useSelected();
  const isCollapsed = useEditorSelector((editor) => editor.api.isCollapsed(), []);
  const [open, setOpen] = React.useState(selected && isCollapsed);
  React.useEffect(() => {
    if (selected && isCollapsed) {
      setOpen(true);
    }
  }, [selected, isCollapsed]);
  useEquationElement({
    element,
    katexRef,
    options: EQUATION_RENDER_OPTIONS,
  });
  return (
    <PlateElement
      {...props}
      className={cn("mx-1 inline-block select-none rounded-sm [&_.katex-display]:my-0!")}
    >
      <Popover modal={false} open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            className={cn(
              'after:-inset-x-1 after:-inset-y-0.5 after:absolute after:z-1 after:rounded-sm after:content-[""]',
              "h-6",
              inlineSuggestionVariants(),
              ((element.texExpression.length > 0 && open) || selected) && "after:bg-muted-foreground/15",
              element.texExpression.length === 0 && "text-muted-foreground after:bg-neutral-500/10",
            )}
            contentEditable={false}
          >
            <span
              ref={katexRef}
              className={cn(element.texExpression.length === 0 && "hidden", "font-mono leading-none")}
            />
            {element.texExpression.length === 0 && (
              <span>
                <RadicalIcon className="mr-1 inline-block size-4 align-text-bottom" />
                New equation
              </span>
            )}
          </div>
        </PopoverTrigger>
        <EquationPopoverContent
          isInline
          className="my-auto"
          open={open}
          placeholder="E = mc^2"
          setOpen={setOpen}
        />
      </Popover>
      {props.children}
    </PlateElement>
  );
};



export { EquationElement, InlineEquationElement };
