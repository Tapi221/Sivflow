import type { useCardSetViewScreenController } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewScreenController";

export type CardSetViewScreenController = ReturnType<
  typeof useCardSetViewScreenController
>;

export interface CardSetViewContentProps {
  controller: CardSetViewScreenController;
}
