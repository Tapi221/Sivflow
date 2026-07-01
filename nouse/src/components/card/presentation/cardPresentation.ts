import { cn } from "@web-renderer/lib/utils";
import { CARD_SHELL_COMMON_CLASS_NAME } from "@/components/card/frame/cardShellClassNames";



type CardPresentationContext = {
  inPager: boolean;
  isCurrentCard: boolean;
  isEditing: boolean;
  isStandaloneEditor: boolean;
  hasFocusWithin: boolean;
};
type CardPresentationState = {
  isActiveCard: boolean;
  isInteractiveCard: boolean;
  showEditingOutline: boolean;
  showActiveChrome: boolean;
};
type CardPresentationContextInput = Partial<Pick<CardPresentationContext, "isCurrentCard" | "isStandaloneEditor" | "hasFocusWithin">>;



const resolveCardPresentationState = (context: CardPresentationContext): CardPresentationState => {
  const isActiveCard = context.isStandaloneEditor || context.isCurrentCard;
  const isInteractiveCard = isActiveCard || context.hasFocusWithin;

  return {
    isActiveCard,
    isInteractiveCard,
    showEditingOutline: context.isEditing && isActiveCard && !context.isStandaloneEditor,
    showActiveChrome: context.inPager && isActiveCard,
  };
};
const buildCardShellClassName = (state: CardPresentationState, className?: string) => cn(CARD_SHELL_COMMON_CLASS_NAME, state.showActiveChrome && "card-shell--active", state.showEditingOutline && "card-shell--editing", className);
const buildCardChromeClassName = (state: CardPresentationState, options?: { hoverable?: boolean;
  plain?: boolean;
  className?: string;
},
) =>
  cn(
    "card-active-chrome",
    state.showActiveChrome && "card-active-chrome--active",
    options?.hoverable && "card-active-chrome--hoverable",
    options?.plain && "card-active-chrome--plain",
    options?.className,
  );



export { resolveCardPresentationState, buildCardShellClassName, buildCardChromeClassName };


export type { CardPresentationContext, CardPresentationState, CardPresentationContextInput };
