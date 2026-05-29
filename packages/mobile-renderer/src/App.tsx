import { memo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { initialWindowMetrics, SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { IosCalendarScheduleYear } from "@mobile/integration/ioscalendar/IosCalendarScheduleYear";
import { NavigationBarMobile, type NavigationBarItemId } from "@mobile/pane/navigationbar/navigationbar";

const AppContent = () => {
  const insets = useSafeAreaInsets();
  const [activeItemId, setActiveItemId] = useState<NavigationBarItemId>("schedule");
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  return (
    <View style={[styles.safeArea, { paddingBottom: insets.bottom, paddingTop: insets.top }]}> 
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Mobile Native</Text>
        <Text style={styles.title}>Schedule</Text>
      </View>
      <View style={styles.content}>
        <IosCalendarScheduleYear selectedDate={selectedDate} yearDate={selectedDate} onSelectDate={setSelectedDate} />
      </View>
      <NavigationBarMobile activeItemId={activeItemId} onItemSelect={setActiveItemId} />
    </View>
  );
};

const App = () => (
  <SafeAreaProvider initialMetrics={initialWindowMetrics}>
    <AppContent />
  </SafeAreaProvider>
);

const styles = StyleSheet.create({
  content: {
    flex: 1,
    minHeight: 0,
  },
  eyebrow: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  header: {
    backgroundColor: "#ffffff",
    gap: 4,
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  safeArea: {
    backgroundColor: "#ffffff",
    flex: 1,
  },
  title: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
});

const MemoizedApp = memo(App);

MemoizedApp.displayName = "App";

export default MemoizedApp;
