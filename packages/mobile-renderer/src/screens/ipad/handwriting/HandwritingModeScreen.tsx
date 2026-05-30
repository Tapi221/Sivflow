import { memo, useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { InkEditTool, InkPoint, InkSide, InkStroke } from "@core/domain/card/ink/inkDocument";
import IpadInkCanvasHost from "../../../components/ipad/ink/IpadInkCanvasHost";
import IpadInkToolbar from "../../../components/ipad/ink/IpadInkToolbar";

type HandwritingModeSession = {
  id: string;
  cardId: string;
  side: InkSide;
};

type HandwritingModeScreenProps = {
  session?: HandwritingModeSession | null;
};

const ERASE_RADIUS = 44;

const hasPointNear = (stroke: InkStroke, point: InkPoint) => {
  return stroke.points.some((candidate) => {
    const dx = candidate.x - point.x;
    const dy = candidate.y - point.y;
    return Math.sqrt(dx * dx + dy * dy) <= ERASE_RADIUS;
  });
};

const HandwritingModeScreen = ({ session }: HandwritingModeScreenProps) => {
  const [tool, setTool] = useState<InkEditTool>("pen");
  const [strokes, setStrokes] = useState<InkStroke[]>([]);

  const handleStrokeComplete = useCallback((stroke: InkStroke) => {
    setStrokes((current) => [...current, stroke]);
  }, []);

  const handleErasePoint = useCallback((point: InkPoint) => {
    setStrokes((current) => current.filter((stroke) => !hasPointNear(stroke, point)));
  }, []);

  const handleClear = useCallback(() => {
    setStrokes([]);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>iPad only</Text>
        <Text style={styles.title}>手書きモード</Text>
        <Text style={styles.description}>Desktopで開いているカードに接続して、Apple Pencil用の手書きUIを表示します。スマホにはこの画面を表示しません。</Text>
      </View>

      <View style={styles.sessionCard}>
        <View style={styles.sessionTextBlock}>
          <Text style={styles.sessionLabel}>Session</Text>
          <Text style={styles.sessionValue}>{session?.id ?? "未接続"}</Text>
          <Text style={styles.sessionMeta}>{session ? `${session.cardId} / ${session.side}` : "Desktop側のsession待ち"}</Text>
        </View>
        <Text style={styles.strokeCount}>{strokes.length} strokes</Text>
      </View>

      <IpadInkCanvasHost cardId={session?.cardId} tool={tool} strokes={strokes} onErasePoint={handleErasePoint} onStrokeComplete={handleStrokeComplete} />
      <View style={styles.toolbarRow}>
        <View style={styles.toolbarHost}>
          <IpadInkToolbar tool={tool} onToolChange={setTool} />
        </View>
        <Pressable accessibilityRole="button" onPress={handleClear} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  clearButton: {
    alignItems: "center",
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  clearButtonText: {
    color: "#be123c",
    fontSize: 13,
    fontWeight: "800",
  },
  container: {
    backgroundColor: "#ffffff",
    flex: 1,
    gap: 16,
    padding: 20,
  },
  description: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
  },
  eyebrow: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  header: {
    gap: 8,
  },
  sessionCard: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 16,
  },
  sessionLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
  },
  sessionMeta: {
    color: "#64748b",
    fontSize: 12,
  },
  sessionTextBlock: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  sessionValue: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  strokeCount: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "900",
  },
  title: {
    color: "#0f172a",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  toolbarHost: {
    flex: 1,
  },
  toolbarRow: {
    flexDirection: "row",
    gap: 8,
  },
});

const MemoizedHandwritingModeScreen = memo(HandwritingModeScreen);

MemoizedHandwritingModeScreen.displayName = "HandwritingModeScreen";

export default MemoizedHandwritingModeScreen;
export type { HandwritingModeScreenProps, HandwritingModeSession };
