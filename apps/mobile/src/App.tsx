import { memo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationBarMobile, type NavigationItemId } from "./NavigationBarMobile";

const onboardingSteps = [
  "既存 Web / Electron 版はそのまま維持",
  "mobile は Expo + React Native の別 entry から開始",
  "UI は React Native で作り直し、型・定数・ロジック共有を段階的に検討",
] as const;

const App = () => {
  const [activeItemId, setActiveItemId] = useState<NavigationItemId>("home");

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Mobile Preview</Text>
          <Text style={styles.title}>FlashCard Master</Text>
          <Text style={styles.description}>
            Expo で作り始める React Native 版の最小 entry です。まずは Web 版を壊さず、mobile 専用 UI をここから育てます。
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Start plan</Text>
          {onboardingSteps.map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <NavigationBarMobile activeItemId={activeItemId} onSelectItem={setActiveItemId} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    gap: 16,
    padding: 20,
    shadowColor: "#172033",
    shadowOffset: {
      height: 12,
      width: 0,
    },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  content: {
    gap: 24,
    padding: 24,
    paddingBottom: 112,
  },
  description: {
    color: "#4A5872",
    fontSize: 16,
    lineHeight: 24,
  },
  eyebrow: {
    color: "#35507B",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  hero: {
    gap: 12,
    paddingTop: 32,
  },
  safeArea: {
    backgroundColor: "#F8FAFB",
    flex: 1,
  },
  sectionTitle: {
    color: "#172033",
    fontSize: 18,
    fontWeight: "700",
  },
  stepNumber: {
    backgroundColor: "#E5ECF8",
    borderRadius: 999,
    color: "#35507B",
    fontSize: 14,
    fontWeight: "700",
    height: 28,
    lineHeight: 28,
    overflow: "hidden",
    textAlign: "center",
    width: 28,
  },
  stepRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  stepText: {
    color: "#2E3A50",
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  title: {
    color: "#172033",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 40,
  },
});

const MemoizedApp = memo(App);

MemoizedApp.displayName = "App";

export default MemoizedApp;
