import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { InkEditTool } from "@core/domain/card/ink/inkDocument";

type IpadInkToolbarProps = {
  tool: InkEditTool;
  onToolChange: (tool: InkEditTool) => void;
};

type ToolItem = {
  label: string;
  value: InkEditTool;
};

const TOOL_ITEMS: readonly ToolItem[] = [
  { label: "Pen", value: "pen" },
  { label: "Marker", value: "highlighter" },
  { label: "Clear", value: "eraser" },
];

const IpadInkToolbar = ({ tool, onToolChange }: IpadInkToolbarProps) => (
  <View style={styles.container}>
    {TOOL_ITEMS.map((item) => {
      const isActive = item.value === tool;

      return (
        <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: isActive }} onPress={() => onToolChange(item.value)} style={[styles.toolButton, isActive && styles.toolButtonActive]}>
          <Text style={[styles.toolButtonText, isActive && styles.toolButtonTextActive]}>{item.label}</Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
  },
  toolButton: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  toolButtonActive: {
    backgroundColor: "#eef2ff",
    borderColor: "#c7d2fe",
  },
  toolButtonText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "800",
  },
  toolButtonTextActive: {
    color: "#2563eb",
  },
});

const MemoizedIpadInkToolbar = memo(IpadInkToolbar);

MemoizedIpadInkToolbar.displayName = "IpadInkToolbar";

export default MemoizedIpadInkToolbar;
export type { IpadInkToolbarProps };
