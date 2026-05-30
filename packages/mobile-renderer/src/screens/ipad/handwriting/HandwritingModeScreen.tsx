import { memo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { InkEditTool, InkSide } from "@core/domain/card/ink/inkDocument";
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

const HandwritingModeScreen = ({ session }: HandwritingModeScreenProps) => {
  const [tool, setTool] = useState<InkEditTool>("pen");

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>iPad only</Text>
        <Text style={styles.title}>手書きモード</Text>
        <Text style={styles.description}>Desktopで開いているカードに接続して、Apple Pencil用の手書きUIを表示します。スマホにはこの画面を表示しません。</Text>
      </View>

      <View style={styles.sessionCard}>
        <Text style={styles.sessionLabel}>Session</Text>
        <Text style={styles.sessionValue}>{session?.id ?? "未接続"}</Text>
        <Text style={styles.sessionMeta}>{session ? `${session.cardId} / ${session.side}` : "Desktop側のsession待ち"}</Text>
      </View>

      <IpadInkCanvasHost cardId={session?.cardId} />
      <IpadInkToolbar tool={tool} onToolChange={setTool} />
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
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
  sessionValue: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  title: {
    color: "#0f172a",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
});

const MemoizedHandwritingModeScreen = memo(HandwritingModeScreen);

MemoizedHandwritingModeScreen.displayName = "HandwritingModeScreen";

export default MemoizedHandwritingModeScreen;
export type { HandwritingModeScreenProps, HandwritingModeSession };
