import React from "react";
import { Platform, requireNativeComponent } from "react-native";

type IpadInkCanvasHostProps = { cardId?: string; tool?: unknown; strokes?: unknown[]; onErasePoint?: unknown; onStrokeComplete?: unknown };

const NativeInkCanvas = Platform.OS === "ios" ? requireNativeComponent("SivflowPencilKitCanvas") : null;

const