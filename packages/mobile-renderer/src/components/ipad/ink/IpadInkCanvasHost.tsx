import { memo, useCallback } from "react";
import { Platform, requireNativeComponent, StyleSheet, Text, View } from "react-native";
import type { NativeSyntheticEvent, ViewProps } from "react-native";
import type { InkEditTool, InkStroke } from "@core/domain/card/ink/inkDocument";

type NativeInkStrokesChangeEvent = {
  strokes: InkStroke[];
};

type NativePencilKitCanvasProps = ViewProps & {
  card