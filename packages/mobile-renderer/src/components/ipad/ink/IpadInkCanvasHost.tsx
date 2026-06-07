import React from "react";
import { Platform, requireNativeComponent, View } from "react-native";

const NativeInkCanvas = Platform.OS === "ios" ? requireNativeComponent("SivflowPencilKitCanvas") : null;

export default function IpadInkCanvasHost(props: any) {
  if (!NativeInkCanvas) return React.createElement(View, { style: props.style });
  return React.createElement(NativeInkCanvas, { style: props.style });
}
