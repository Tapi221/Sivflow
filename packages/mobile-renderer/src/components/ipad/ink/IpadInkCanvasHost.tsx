import React from "react";
import { Platform, requireNativeComponent, Text, View } from "react-native";
import type { ViewProps } from "react-native";
import type { InkEditTool, InkPoint, InkStroke } from "@core/domain/card/ink/inkDocument";

type IpadInkCanvasHostProps = {
  cardId?: string | null;
  tool?: InkEditTool;
  strokes?: InkStroke[];
  onErasePoint?: (point: InkPoint) => void;
  onStrokeComplete?: (stroke: InkStroke) => void;
};

type NativeProps = ViewProps & {
  cardId?: string | null;
  tool?: InkEditTool;
 