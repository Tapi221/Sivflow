import type { ReactNode } from "react";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";

export type CardSurfaceFace = "question" | "answer";

type CardSurfaceLayoutProps = { cardLayoutMode: CardLayoutMode; questionNode: ReactNode; answerNode: ReactNode; flipNode?: ReactNode };

export function CardSurfaceLayout(props: CardSurfaceLayoutProps): ReactNode {
  if (props.cardLayoutMode === "split") return [props