import React from "react";
import { Platform, requireNativeComponent } from "react-native";

const NativeInkCanvas = Platform.OS === "ios" ? requireNativeComponent("SivflowPencilKitCanvas") : null;

const IpadInkCanvasHost = () => NativeInkCanvas ? React.createElement(NativeInkCanvas, { style: { flex: 1 } }) : null;

export default React.memo(IpadInkCanvasHost);
