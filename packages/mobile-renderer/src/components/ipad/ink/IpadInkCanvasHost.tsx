import { memo, useCallback, useMemo, useRef, useState } from "react";
import { type GestureResponderEvent, type LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from "react-native";
import { INK_PAPER_H, INK_PAPER_W, type InkEditTool, type InkPoint, type InkStroke, type InkTool } from "@core/domain/card/ink/inkDocument";

type IpadInkCanvasHostProps = {
  cardId?: string | null;
  tool: InkEditTool;
  strokes: readonly InkStroke[];
  onErasePoint: (point: InkPoint) => void;
  onStrokeComplete: (stroke: InkStroke) => void;
};

type CanvasSize = {
  width: number;
  height: number;
};

type InkToolStyle = {
  color: string;
  opacity: number;
  width: number;
};

const MIN_POINT_DISTANCE = 4;
const DOT_SIZE = 5;

const TOOL_STYLES: Record<InkTool, InkToolStyle> = {
  highlighter: {
    color: "#facc15",
    opacity: 0.42,
    width: 14,
  },
  pen: {
    color: "#0f172a",
    opacity: 1,
    width: 4,
  },
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const createStrokeId = () => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const getInkTool = (tool: InkEditTool): InkTool => {
  return tool === "highlighter" ? "highlighter" : "pen";
};

const getPointDistance = (a: InkPoint, b: InkPoint) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const toInkPoint = (event: GestureResponderEvent, size: CanvasSize): InkPoint => {
  const width = Math.max(1, size.width);
  const height = Math.max(1, size.height);
  const locationX = clamp(event.nativeEvent.locationX, 0, width);
  const locationY = clamp(event.nativeEvent.locationY, 0, height);

  return {
    x: (locationX / width) * INK_PAPER_W,
    y: (locationY / height) * INK_PAPER_H,
    p: 0.5,
    t: Date.now(),
  };
};

const toCanvasPoint = (point: InkPoint, size: CanvasSize) => {
  const width = Math.max(1, size.width);
  const height = Math.max(1, size.height);

  return {
    left: (point.x / INK_PAPER_W) * width - DOT_SIZE / 2,
    top: (point.y / INK_PAPER_H) * height - DOT_SIZE / 2,
  };
};

const IpadInkCanvasHost = ({ cardId, tool, strokes, onErasePoint, onStrokeComplete }: IpadInkCanvasHostProps) => {
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ height: 1, width: 1 });
  const [activePoints, setActivePoints] = useState<InkPoint[]>([]);
  const activePointsRef = useRef<InkPoint[]>([]);

  const resetActiveStroke = useCallback(() => {
    activePointsRef.current = [];
    setActivePoints([]);
  }, []);

  const appendPoint = useCallback((point: InkPoint) => {
    const previous = activePointsRef.current.at(-1);
    if (previous && getPointDistance(previous, point) < MIN_POINT_DISTANCE) return;

    const next = [...activePointsRef.current, point];
    activePointsRef.current = next;
    setActivePoints(next);
  }, []);

  const completeStroke = useCallback(() => {
    const points = activePointsRef.current;
    if (points.length === 0) return;

    const inkTool = getInkTool(tool);
    const style = TOOL_STYLES[inkTool];
    const stroke: InkStroke = {
      id: createStrokeId(),
      tool: inkTool,
      color: style.color,
      width: style.width,
      opacity: style.opacity,
      points,
      createdAt: Date.now(),
    };

    resetActiveStroke();
    onStrokeComplete(stroke);
  }, [onStrokeComplete, resetActiveStroke, tool]);

  const handlePoint = useCallback((event: GestureResponderEvent) => {
    const point = toInkPoint(event, canvasSize);
    if (tool === "eraser") {
      onErasePoint(point);
      return;
    }

    appendPoint(point);
  }, [appendPoint, canvasSize, onErasePoint, tool]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: handlePoint,
    onPanResponderMove: handlePoint,
    onPanResponderRelease: completeStroke,
    onPanResponderTerminate: completeStroke,
    onStartShouldSetPanResponder: () => true,
  }), [completeStroke, handlePoint]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setCanvasSize({ height: Math.max(1, height), width: Math.max(1, width) });
  }, []);

  const renderedPoints = [...strokes.flatMap((stroke) => stroke.points.map((point) => ({ point, stroke }))), ...activePoints.map((point) => ({ point, stroke: null }))];

  return (
    <View onLayout={handleLayout} style={styles.container} {...panResponder.panHandlers}>
      {renderedPoints.length === 0 && (
        <View pointerEvents="none" style={styles.emptyState}>
          <Text style={styles.label}>Ink Canvas</Text>
          <Text style={styles.description}>{cardId ? `Card: ${cardId}` : "Desktop session に接続すると、ここに手書きキャンバスを表示します。"}</Text>
        </View>
      )}

      {renderedPoints.map(({ point, stroke }, index) => {
        const position = toCanvasPoint(point, canvasSize);
        const color = stroke?.color ?? TOOL_STYLES[getInkTool(tool)].color;
        const opacity = stroke?.opacity ?? TOOL_STYLES[getInkTool(tool)].opacity;

        return <View key={`${point.t}-${index}`} pointerEvents="none" style={[styles.dot, position, { backgroundColor: color, opacity }]} />;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    borderRadius: 24,
    borderStyle: "dashed",
    borderWidth: 1,
    flex: 1,
    minHeight: 280,
    overflow: "hidden",
  },
  description: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    textAlign: "center",
  },
  dot: {
    borderRadius: DOT_SIZE / 2,
    height: DOT_SIZE,
    position: "absolute",
    width: DOT_SIZE,
  },
  emptyState: {
    alignItems: "center",
    bottom: 0,
    gap: 8,
    justifyContent: "center",
    left: 0,
    padding: 24,
    position: "absolute",
    right: 0,
    top: 0,
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
