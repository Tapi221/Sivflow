import React from "react";
import { Platform, requireNativeComponent } from "react-native";

const NativeInkCanvas = Platform.OS === "ios" ? requireNativeComponent("SivflowPencilKitCanvas") : null;

const IpadInkCanvasHost = (props: any) => NativeInkCanvas ? React.createElement(NativeInkCanvas, { onStrokeComplete: props.onStrokeComplete, style: { flex: 1 }, tool: props.tool }) : null;
