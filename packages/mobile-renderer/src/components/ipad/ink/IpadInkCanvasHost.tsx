import { memo, useCallback } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import type { InkEditTool, InkStroke } from "@core/domain/card/ink/inkDocument";
import NativePencilKitCanvas from "./NativePencilKitCanvas";

type IpadInkCanvasHostProps = {
  cardId?: string | null;
  clearRevision: number;
  tool: InkEditTool;
  strokes: readonly InkStroke[];
  onDrawingChange: (strokes: InkStroke[]) => void;
};

type NativePencilKit