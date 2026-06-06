import type { CSSProperties } from "react";
import React from "react";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { cn } from "@/lib/utils";

export type CardSurfaceFace = "question" | "answer";

export type CardSurfaceFaceAnchorProps = {
  face: CardSurfaceFace;
  fillHeight?: boolean;
  children: React.ReactNode;
};

