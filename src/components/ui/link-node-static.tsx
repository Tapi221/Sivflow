import { getLinkAttributes } from "@platejs/link";
import type { TLinkElement } from "platejs";
import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";
import { inlineSuggestionVariants } from "@/lib/suggestion";
import { cn } from "@/lib/utils";

const LINK_ELEMENT_CLASS_NAME = "font-medium text-inherit underline decoration-current underline-offset-4";

const LinkElementStatic = (props: SlateElementProps<TLinkElement>) => {
  const { attributes, children, editor, element } = props;

  return (
    <SlateElement
      {...props}
      as="a"
      className={cn(LINK_ELEMENT_CLASS_NAME, inlineSuggestionVariants())}
      attributes={{ ...attributes, ...getLinkAttributes(editor, element) }}
    >
      {children}
    </SlateElement>
  );
};

export { LinkElementStatic };
