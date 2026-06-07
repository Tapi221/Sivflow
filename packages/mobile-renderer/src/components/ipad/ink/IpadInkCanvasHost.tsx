import React from "react";
import { Text, View } from "react-native";

type IpadInkCanvasHostProps = { cardId?: string | null; tool?: unknown; strokes?: unknown[]; onErasePoint?: unknown; onStrokeComplete?: unknown };

const IpadInkCanvasHost = ({ cardId }: IpadInkCanvasHostProps) => <View><Text>{cardId ?? "iOS handwriting"}</Text></View>;

export default React.memo(IpadInkCanvasHost);
export type { IpadInkCanvasHost