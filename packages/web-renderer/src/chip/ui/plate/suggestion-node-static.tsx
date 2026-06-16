import { BaseSuggestionPlugin } from "@platejs/suggestion";
import { cn } from "@web-renderer/lib/utils";
import { cva } from "class-variance-authority";
import type { TElement, TSuggestionText } from "platejs";
import type { SlateLeafProps } from "platejs/static";
import { SlateLeaf } from "platejs/static";

type StaticSuggestionElement = TElement & {
  suggestion?: { type?: string };
};

const voidRemoveSuggestionClass = 'relative overflow-hidden before:pointer-events-none before:absolute before:top-1/2 before:left-1/2 before:z-20 before:flex before:size-10 before:-translate-x-1/2 before:-translate-y-1/2 before:items-center before:justify-center before:rounded-full before:bg-red-500/90 before:text-2xl before:font-semibold before:text-white before:shadow-lg before:content-["X"] after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit] after:border after:border-red-300/80 after:bg-zinc-950/35 after:content-[""]';
const voidRemoveSuggestionOverlayVariants = cva(
  "pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[inherit]",
  {
    defaultVariants: { active: false },
    variants: {
      active: {
        false: "hidden",
        true: 'before:-translate-x-1/2 before:-translate-y-1/2 before:pointer-events-none before:absolute before:top-1/2 before:left-1/2 before:z-20 before:flex before:size-10 before:items-center before:justify-center before:rounded-full before:bg-red-500/90 before:font-semibold before:text-2xl before:text-white before:shadow-lg before:content-["X"] after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit] after:border after:border-red-300/80 after:bg-zinc-950/35 after:content-[""]',
      },
    },
  },
);
const voidRemoveSuggestionVariants = cva("", {
  defaultVariants: { active: false },
  variants: {
    active: {
      false: "",
      true: voidRemoveSuggestionClass,
    },
  },
});

const isStaticVoidRemoveSuggestion = (element: TElement) => (element as StaticSuggestionElement).suggestion?.type === "remove";

const VoidRemoveSuggestionOverlayStatic = ({ editor, element }: { editor: any; element: TElement }) => {
  const active = editor.api.isVoid(element) && !editor.api.isInline(element) && isStaticVoidRemoveSuggestion(element);
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
const SuggestionLeafStatic = (props: SlateLeafProps<TSuggestionText>) => {
  const { editor, leaf } = props;
  const dataList = editor.getApi(BaseSuggestionPlugin).suggestion.dataList(leaf);
  const hasRemove = dataList.some((data) => data.type === "remove");
  const diffOperation = { type: hasRemove ? "delete" : "insert" } as const;
  const Component = ({ delete: "del", insert: "ins", update: "span" } as const)[diffOperation.type];
  return (
    <SlateLeaf
      {...props}
      as={Component}
      className={cn(
        "bg-emerald-100 text-emerald-700 no-underline transition-colors duration-200",
        hasRemove && "bg-red-100 text-red-700 line-through",
      )}
    >
      {props.children}
    </SlateLeaf>
  );
};

export { VoidRemoveSuggestionOverlayStatic, SuggestionLeafStatic, isStaticVoidRemoveSuggestion, voidRemoveSuggestionClass, voidRemoveSuggestionOverlayVariants, voidRemoveSuggestionVariants };
