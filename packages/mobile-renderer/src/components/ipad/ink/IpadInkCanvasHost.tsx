import React from "react";
import { Text, View } from "react-native";

type IpadInkCanvasHostProps = any;

const IpadInkCanvasHost = (props: IpadInkCanvasHostProps) => React.createElement(View, null, React.createElement(Text, null, props.cardId ?? "iOS handwriting"));

export default React.memo(IpadInkCanvasHost);
export type { IpadInkCanvasHostProps };
