import type { CSSProperties } from "react";
import { CardSetViewDesktop } from "@/features/cardsetview/presentation/web/ui/CardSetViewDesktop";
import type { CardSetViewContentProps } from "./cardSetViewContentProps";

type CardSetViewChromeResetStyle = CSSProperties & {
  "--card-selected-surface": string;
  "--card-border-selected": string;
  "--card-shadow-selected": string;
  "--card-selected-outline-width": string;
  "--card-selected-outline