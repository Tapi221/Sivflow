import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Platform, requireNativeComponent, View } from "react-native";

type IpadInkCanvasHostProps = {
  onStrokeComplete?: () => void;
  style?: StyleProp<ViewStyle>;
};

const NativeInkCanvas = Platform.OS === "ios" ? requireNativeComponent<IpadInkCanvasHostProps>("SivflowPencilKitCanvas") : null;

const IpadInkCanvasHost = ({ onStrokeComplete, style }: IpadInkCanvasHostProps) => {
  if (!NativeInkCanvas) return React.createElement(View, { style });

  return React.createElement(NativeInkCanvas, { onStrokeComplete, style });
};

export default IpadInkCanvasHost;
