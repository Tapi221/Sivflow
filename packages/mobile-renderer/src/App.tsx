import { type ComponentType, memo, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { initialWindowMetrics, SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import HandwritingModeScreen from "./screens/ipad/handwriting/HandwritingModeScreen";
import TrashScreen from "./screens/TrashScreen";

type NavigationItemId = "explore" | "library" | "home" | "schedule" | "ipadHandwriting" | "trash" | "settings";

type NavigationItem = {
  id: NavigationItemId;
  label: string;
};

type NavigationBarProps = {
  activeItemId: NavigationItemId;
  items: readonly NavigationItem[];
  onSelectItem: (itemId: NavigationItemId) => void;
};

type ScheduleYearContentProps = {
  yearDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
};

type AppContentProps = {
  ScheduleYearComponent: ComponentType<ScheduleYearContentProps>;
};

type AppProps = Partial<AppContentProps>;

const BASE_NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { id: "explore", label: "Explore" },
  { id: "library", label: "Library" },
  { id: "home", label: "Home" },
  { id: "schedule", label: "Schedule" },
  { id: "trash", label: "Trash" },
  { id: "settings", label: "Settings" },
];

const IPAD_NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { id: "ipadHandwriting", label: "Handwriting" },
];

const isIpadLayout = (width: number, height: number) => {
  return Platform.OS === "ios" && Math.min(width, height) >= 744;
};

const DefaultScheduleYear = () => (
  <View style={styles.emptySchedule}>
    <Text style={styles.emptyScheduleText}>Schedule renderer is not configured.</Text>
  </View>
);

const NavigationBar = ({ activeItemId, items, onSelectItem }: NavigationBarProps) => (
  <View accessibilityLabel="Mobile navigation" style={styles.navigationBar}>
    {items.map((item) => {
      const isActive = item.id === activeItemId;

      return (
        <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: isActive }} onPress={() => onSelectItem(item.id)} style={[styles.navigationItem, isActive && styles.navigationItemActive]}>
          <Text style={[styles.navigationItemLabel, isActive && styles.navigationItemLabelActive]}>{item.label}</Text>
        </Pressable>
      );
    })}
  </View>
);

const AppContent = ({ ScheduleYearComponent }: AppContentProps) => {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const [activeItemId, setActiveItemId] = useState<NavigationItemId>("schedule");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const isIpad = isIpadLayout(width, height);
  const isTrashActive = activeItemId === "trash";
  const isHandwritingActive = isIpad && activeItemId === "ipadHandwriting";
  const navigationItems = useMemo(() => {
    return isIpad ? [...BASE_NAVIGATION_ITEMS, ...IPAD_NAVIGATION_ITEMS] : BASE_NAVIGATION_ITEMS;
  }, [isIpad]);

  useEffect(() => {
    if (!isIpad && activeItemId === "ipadHandwriting") setActiveItemId("schedule");
  }, [activeItemId, isIpad]);

  const title = isTrashActive ? "Trash" : isHandwritingActive ? "Handwriting" : "Schedule";

  return (
    <View style={[styles.safeArea, { paddingBottom: insets.bottom, paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Mobile Native</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.content}>
        {isTrashActive ? (
          <TrashScreen />
        ) : isHandwritingActive ? (
          <HandwritingModeScreen />
        ) : (
          <ScheduleYearComponent selectedDate={selectedDate} yearDate={selectedDate} onSelectDate={setSelectedDate} />
        )}
      </View>
      <NavigationBar activeItemId={activeItemId} items={navigationItems} onSelectItem={setActiveItemId} />
    </View>
  );
};

const App = ({ ScheduleYearComponent = DefaultScheduleYear }: AppProps) => (
  <SafeAreaProvider initialMetrics={initialWindowMetrics}>
    <AppContent ScheduleYearComponent={ScheduleYearComponent} />
  </SafeAreaProvider>
);

const styles = StyleSheet.create({
  content: {
    flex: 1,
    minHeight: 0,
  },
  emptySchedule: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  emptyScheduleText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
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
export type { AppProps, ScheduleYearContentProps };
