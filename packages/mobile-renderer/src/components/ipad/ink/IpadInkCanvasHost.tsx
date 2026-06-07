import React, { useCallback } from "react";
import { Platform, requireNativeComponent } from "react-native";

const NativeInkCanvas = Platform.OS === "ios" ? requireNativeComponent("SivflowPencilKitCanvas") : null;

const IpadInkCanvasHost = (props: any) => {
  const handleStrokeComplete = useCallback((event: any) => {
    props.onStrokeComplete?.(event.nativeEvent);
  }, [props.onStrokeComplete]);
  return NativeInkCanvas ? React.createElement