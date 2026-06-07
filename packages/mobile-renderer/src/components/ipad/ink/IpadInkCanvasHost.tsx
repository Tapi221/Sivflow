import React from "react";
import { Platform, requireNativeComponent, Text, View } from "react-native";
import type { ViewProps } from "react-native";

type Props = ViewProps & { cardId?: string | null; tool?: unknown; strokes?: unknown; onErasePoint?: unknown; onStrokeComplete?: unknown };

const NativeInkCanvas = Platform.OS === "ios" ? requireNativeComponent<Props>("SivflowPencilKitCanvas") : null;

const I