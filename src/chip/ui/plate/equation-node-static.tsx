import { getEquationHtml } from "@platejs/math";
import { RadicalIcon } from "lucide-react";
import type { TEquationElement } from "platejs";
import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";
import { inlineSuggestionVariants } from "@/chip/ui/plate/suggestion";
import { cn } from "@/lib/utils";

const EQUATION_RENDER_OPTIONS = {
  displayMode: true,
  errorColor: "#cc0000",
  fleqn: false,
  leqno: false,
  macros: { "\\f": "#1f(#2)" },
  output: "htmlAndMathml" as const,
  strict: "warn" as const,
  throwOnError: false,
  trust: false,
};

const EquationElementStatic = (props: SlateElementProps<TEquationElement>) => {
  const { element } = props;
  const html = getEquationHtml({
    element,
    options: EQUATION_RENDER_OPTIONS,
  });
  return (
    <SlateElement className="my-1" {...props}>
      <div
        className={cn(
          "group flex select-none items-center justify-center rounded-sm hover:bg-muted/60 data-[selected=true]:bg-muted/60",
          element.texExpression.length === 0 ? "bg-muted p-3 pr-9" : "px-2 py-1",
        )}
      >
        {element.texExpression.length > 0 ? (
          <span dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <div className="flex h-7 w-full items-center gap-2 whitespace-nowrap text-muted-foreground text-sm">
            <RadicalIcon className="size-6 text-muted-foreground/80" />
            Add a Tex equation
          </div>
        )}
      </div>
      {props.children}
    </SlateElement>
  );
};
const InlineEquationElementStatic = (props: SlateElementProps<TEquationElement>) => {
  const html = getEquationHtml({
    element: props.element,
    options: EQUATION_RENDER_OPTIONS,
  });
  return (
    <SlateElement
      className="inline-block select-none rounded-sm [&_.katex-display]:my-0"
      {...props}
    >
      <div
        className={cn(
          'after:-top-0.5 after:-left-1 after:absolute after:inset-0 after:z-1 after:h-[calc(100%)+4px] after:w-[calc(100%+8px)] after:rounded-sm after:content-[""]',
          "h-6",
          inlineSuggestionVariants(),
          props.element.texExpression.length === 0 && "text-muted-foreground after:bg-neutral-500/10",
        )}
      >
        <span
          className={cn(props.element.texExpression.length === 0 && "hidden", "font-mono leading-none")}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      {props.children}
    </SlateElement>
  );
};
const EquationElementDocx = (props: SlateElementProps<TEquationElement>) => {
  const { element } = props;
  if (!element.texExpression || element.texExpression.length === 0) {
    return (
      <SlateElement {...props}>
        <p style={{ color: "#888888", fontStyle: "italic" }}>[Empty equation]</p>
        {props.children}
      </SlateElement>
    );
  }
  return (
    <SlateElement {...props}>
      <p
        style={{
          fontFamily: "Cambria Math, Consolas, monospace",
          fontSize: "12pt",
          margin: "8pt 0",
          textAlign: "center",
        }}
      >
        {element.texExpression}
      </p>
      {props.children}
    </SlateElement>
  );
};
const InlineEquationElementDocx = (props: SlateElementProps<TEquationElement>) => {
  const { element } = props;
  if (!element.texExpression || element.texExpression.length === 0) {
    return (
      <SlateElement as="span" {...props}>
        <span style={{ color: "#888888", fontStyle: "italic" }}>[equation]</span>
        {props.children}
      </SlateElement>
    );
  }
  return (
    <SlateElement as="span" {...props}>
      <span style={{ fontFamily: "Cambria Math, Consolas, monospace" }}>
        {element.texExpression}
      </span>
      {props.children}
    </SlateElement>
  );
};

export { EquationElementDocx, EquationElementStatic, InlineEquationElementDocx, InlineEquationElementStatic };
