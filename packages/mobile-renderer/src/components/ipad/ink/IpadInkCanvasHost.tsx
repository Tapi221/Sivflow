import React from "react";
import { Platform, requireNativeComponent, Text, View } from "react-native";

const NativeInkCanvas = Platform.OS === "ios" ? requireNativeComponent("SivflowPencilKitCanvas") : null;

const IpadInkCanvasHost = (props: any) => NativeInkCanvas ? React.createElement(NativeInkCanvas, props) : React.createElement(View, null, React.createElement(Text, null, "iOS handwriting only"));

export default React.memo(IpadInkCanvasHost);
