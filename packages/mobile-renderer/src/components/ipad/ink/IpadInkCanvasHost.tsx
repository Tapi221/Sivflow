import { memo, useCallback } from "react";
import { Platform, StyleSheet, Text, View, requireNativeComponent } from "react-native";
import type { ViewProps } from "react-native";
import type { InkEditTool, InkStroke } from "@core/domain/card/ink/inkDocument";

type IpadInkCanvasHostProps = {
  cardId?: string | null;
  clearRevision: number;
  tool: InkEditTool;
  strokes: readonly InkStroke[];