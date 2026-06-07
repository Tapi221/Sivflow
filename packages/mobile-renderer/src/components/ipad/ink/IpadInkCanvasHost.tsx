import React from "react";
import { Platform, requireNativeComponent, StyleSheet, Text, View } from "react-native";

const NativeInkCanvas = Platform.OS === "ios" ? requireNativeComponent("SivflowPencilKitCanvas") : null;

const resolveStroke = (event: any) => event?.nativeEvent ?? event;

const IpadInkCanvasHost = (props: any) => {
  const handleStrokeComplete = (event: any) => props.onStrokeComplete?.(resolveStroke(event));
  return NativeInkCanvas ? React.createElement(NativeInkCanvas, { cardId: props.cardId, onStrokeComplete: handleStrokeComplete, style: styles.canvas, tool: props.tool }) : React.createElement(View, { style