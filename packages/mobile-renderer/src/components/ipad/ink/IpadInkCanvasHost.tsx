import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { InkEditTool, InkPoint, InkStroke } from "@core/domain/card/ink/inkDocument";

type IpadInkCanvasHostProps = {
  cardId?: string | null;
  tool: InkEditTool;
  strokes: readonly InkStroke[];
  onErasePoint: (point: InkPoint) => void;
  onStrokeComplete: (stroke: Ink