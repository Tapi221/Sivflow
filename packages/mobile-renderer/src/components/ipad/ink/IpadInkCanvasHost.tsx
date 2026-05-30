import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

type IpadInkCanvasHostProps = {
  cardId?: string | null;
};

const IpadInkCanvasHost = ({ cardId }: IpadInkCanvasHostProps) => (
  <View style={styles.container}>
    <Text style={styles.label}>Ink Canvas</Text>
    <Text style={styles.description}>
      {cardId ? `Card: ${cardId}` : "Desktop session に接続すると、ここに手書きキャンバスを表示します。"}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    borderRadius: 24,
    borderStyle: "dashed",
    borderWidth: 1,
    flex: 1,
    gap: 8,
    justifyContent: "center",
    minHeight: 280,
    padding: 24,
  },
  description: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    textAlign: "center",
  },
  label: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
  },
});

const MemoizedIpadInkCanvasHost = memo(IpadInkCanvasHost);

MemoizedIpadInkCanvasHost.displayName = "IpadInkCanvasHost";

export default MemoizedIpadInkCanvasHost;
export type { IpadInkCanvasHostProps };
