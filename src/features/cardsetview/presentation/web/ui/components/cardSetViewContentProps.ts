import type { useCardSetViewScreenController } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewScreenController";



type CardSetViewScreenController = ReturnType<typeof useCardSetViewScreenController>;
interface CardSetViewContentProps {
  controller: CardSetViewScreenController;
}

export type { CardSetViewScreenController, CardSetViewContentProps };
