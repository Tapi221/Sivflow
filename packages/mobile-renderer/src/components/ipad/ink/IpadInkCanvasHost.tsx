import React from "react";
import { StyleSheet, Text, View } from "react-native";

type IpadInkCanvasHostProps = {
  cardId: string;
};

const IpadInkCanvasHost = ({ cardId }: IpadInkCanvasHostProps) => {
  return (
    <View style={styles.container}>
      <Text>{cardId}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
