import React from "react";
import { Platform, requireNativeComponent } from "react-native";

const NativeInkCanvas = Platform.OS === "ios" ? requireNativeComponent("SivflowPencilKitCanvas") : null;

const IpadInkCanvasHost = (props: any) => NativeInkCanvas ? React.createElement(NativeInkCanvas, { ...props, onStrokeComplete: (event: any) => props.onStrokeComplete?.(event.nativeEvent ?? event) }) : null;

export default React.memo(IpadInkCanvasHost);
