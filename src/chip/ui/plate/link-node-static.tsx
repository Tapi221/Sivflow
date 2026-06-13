import { getLinkAttributes } from "@platejs/link";
import type { TLinkElement } from "platejs";
import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";
import { inlineSuggestionVariants } from "@/chip/ui/plate/suggestion";
import { cn } from "@/lib/utils";

const LINK_ELEMENT_CLASS_NAME = "font-medium text-inherit underline decoration-current underline-offset-4";

const LinkElementStatic = (props: SlateElementProps<TLinkElement>) => {
  const { attributes, children, editor, element } = props;
  return (
    <SlateElement
      as="a"
      className={cn(LINK_ELEMENT_CLASS_NAME, inlineSuggestionVariants())}
      attributes={{ ...attributes, ...getLinkAttributes(editor, element) }}
      {...props}
    >
      {children}
    </SlateElement>
  );
};

export { LinkElementStatic };
