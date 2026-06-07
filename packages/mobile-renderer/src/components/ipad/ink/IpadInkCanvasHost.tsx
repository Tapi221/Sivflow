import React from "react";
import { Text, View } from "react-native";

type IpadInkCanvasHostProps = { cardId?: string | null };

const IpadInkCanvasHost = ({ cardId }: IpadInkCanvasHostProps) => <View><Text>{cardId ?? "iOS handwriting"}</Text></View>;

export default React.memo(IpadInkCanvasHost);
export type { IpadInkCanvasHostProps };
