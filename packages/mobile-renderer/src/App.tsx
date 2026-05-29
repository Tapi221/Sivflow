import { memo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { initialWindowMetrics, SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { IosCalendarScheduleYear } from "@mobile/integration/ioscalendar/IosCalendarScheduleYear";

type NavigationItemId = "explore" | "library" | "home" | "schedule" | "settings";

type NavigationItem = {
  id: NavigationItemId;
  label: string;
};

type NavigationBarProps = {
  activeItemId: NavigationItemId;
  onSelectItem: (itemId: NavigationItemId) => void;
};

const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { id: "explore", label: "Explore" },
  { id: "library", label: "Library" },
  { id: "home", label: "Home" },
  { id: "schedule", label: "Schedule" },
  { id: "settings", label: "Settings" },
];

const NavigationBar = ({ activeItemId, onSelectItem }: NavigationBarProps) => (
  <View accessibilityLabel="Mobile navigation" style={styles.navigationBar}>
    {NAVIGATION_ITEMS.map((item) => {
      const isActive = item.id === activeItemId;

      return (
        <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: isActive }} onPress={() => onSelectItem(item.id)} style={[styles.navigationItem, isActive && styles.navigationItemActive]}>
          <Text style={[styles.navigationItemLabel, isActive && styles.navigationItemLabelActive]}>{item.label}</Text>
        </Pressable>
      );
    })}
  </View>
);

const AppContent = () => {
  const insets = useSafeAreaInsets();
  const [activeItemId, setActiveItemId] = useState<NavigationItemId>("schedule");
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
      <NavigationBar activeItemId={activeItemId} onSelectItem={setActiveItemId} />
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
  navigationBar: {
    backgroundColor: "#ffffff",
    borderTopColor: "#e5e7eb",
    borderTopWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  navigationItem: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    justifyContent: "center",
    paddingVertical: 10,
  },
  navigationItemActive: {
    backgroundColor: "#eef2ff",
  },
  navigationItemLabel: {
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "600",
  },
  navigationItemLabelActive: {
    color: "#2563eb",
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
