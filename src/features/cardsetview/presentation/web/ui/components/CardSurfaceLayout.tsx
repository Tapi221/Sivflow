import type { CSSProperties, ReactNode } from "react";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { cn } from "@/lib/utils";

export type CardSurfaceFace = "question" | "answer";

type CardSurfaceLayoutProps = {
  cardLayoutMode: CardLayoutMode;
  questionNode: ReactNode;
  answerNode: ReactNode;
  flipNode?: ReactNode;
  className