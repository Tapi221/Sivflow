import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

const TrashScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Trash</Text>
      <Text style={styles.title}>ゴミ箱</Text>
      <Text style={styles.description}>Mobile のゴミ箱 UI はこの screen に実装します。</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  description: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 10,
    textAlign: "center",
  },
  eyebrow: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 34,
    marginTop: 8,
  },
});

const MemoizedTrashScreen = memo(TrashScreen);

MemoizedTrashScreen.displayName = "TrashScreen";

export default MemoizedTrashScreen;
