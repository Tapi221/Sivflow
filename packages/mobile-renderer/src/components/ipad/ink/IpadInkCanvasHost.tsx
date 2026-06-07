import React from "react";
import { Text, View } from "react-native";

type IpadInkCanvasHostProps = {
  cardId: string;
};

const IpadInkCanvasHost = ({ cardId }: IpadInkCanvasHostProps) => (
  <View>
    <Text>{cardId}</Text>
  </View>
);

export default React.memo(IpadInkCanvasHost);
export type { IpadInkCanvasHostProps };
