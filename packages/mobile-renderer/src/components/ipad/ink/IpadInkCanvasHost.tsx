import { memo, useCallback, useMemo, useRef, useState } from "react";
import { type GestureResponderEvent, type LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from "react-native";
import { INK_PAPER_H, INK_PAPER_W, type InkEditTool, type InkPoint, type InkStroke, type InkTool } from "@core/domain/card/ink/inkDocument";

type IpadInkCanvasHostProps = {
  cardId?: string | null;
  tool: InkEditTool;
  strokes: readonly InkStroke[];
  onErasePoint: (point