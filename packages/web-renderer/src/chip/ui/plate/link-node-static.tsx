import { getLinkAttributes } from "@platejs/link";
import { inlineSuggestionVariants } from "@web-renderer/chip/ui/plate/suggestion";
import { cn } from "@web-renderer/lib/utils";
import type { TLinkElement } from "platejs";
import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";

const LINK_ELEMENT_CLASS_NAME = "font-medium text-inherit underline decoration-current underline-offset-4";

const LinkElementStatic = (props: SlateElementProps<TLinkElement>) => {
  const { attributes, children, editor, element, ...rest } = props;
  return (
    <SlateElement
      as="a"
      className={cn(LINK_ELEMENT_CLASS_NAME, inlineSuggestionVariants())}
      attributes={{ ...attributes, ...getLinkAttributes(editor, element) }}
      editor={editor}
      element={element}
      {...rest}
    >
      {children}
    </SlateElement>
  );
};

export { LinkElementStatic };
