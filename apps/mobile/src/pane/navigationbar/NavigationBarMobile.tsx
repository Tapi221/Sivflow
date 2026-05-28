import { memo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type NavigationItemId = "explore" | "library" | "home" | "schedule" | "settings";

type NavigationBarMobileProps = {
  activeItemId: NavigationItemId;
  onSelectItem: (itemId: NavigationItemId) => void;
};

type NavigationItem = {
  id: NavigationItemId;
  label: string;
};

const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { id: "explore", label: "探す" },
  { id: "library", label: "Library" },
  { id: "home", label: "Home" },
  { id: "schedule", label: "Schedule" },
  { id: "settings", label: "設定" },
];

const ICON_LABELS: Record<NavigationItemId, string> = {
  explore: "⌯",
  library: "▭",
  home: "⌂",
  schedule: "▣",
  settings: "⚙",
};

const NAVIGATION_BAR_WIDTH = 263;
const NAVIGATION_BAR_HEIGHT = 52;
const ACTIVE_ICON_SIZE = 48;
const ICON_SIZE = 20;

const renderIcon = (itemId: NavigationItemId, isActive: boolean): ReactNode => {
  return (
    <Text style={[styles.icon, itemId === "explore" && styles.exploreIcon, isActive && styles.activeIcon]}>
      {ICON_LABELS[itemId]}
    </Text>
  );
};

const NavigationBarMobileComponent = ({ activeItemId, onSelectItem }: NavigationBarMobileProps) => {
  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={styles.surface}>
        {NAVIGATION_ITEMS.map((item) => {
          const isActive = item.id === activeItemId;

          return (
            <Pressable key={item.id} accessibilityLabel={item.label} accessibilityRole="button" accessibilityState={{ selected: isActive }} onPress={() => onSelectItem(item.id)} style={styles.button}>
              {isActive && <View style={styles.activeIndicator}>{renderIcon(item.id, true)}</View>}
              <View style={isActive && styles.hiddenIcon}>{renderIcon(item.id, false)}</View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  activeIcon: {
    color: "#FFFFFF",
  },
  activeIndicator: {
    alignItems: "center",
    backgroundColor: "#62B278",
    borderRadius: ACTIVE_ICON_SIZE / 2,
    elevation: 8,
    height: ACTIVE_ICON_SIZE,
    justifyContent: "center",
    position: "absolute",
    top: -12,
    width: ACTIVE_ICON_SIZE,
    zIndex: 2,
  },
  button: {
    alignItems: "center",
    flex: 1,
    height: NAVIGATION_BAR_HEIGHT,
    justifyContent: "center",
    overflow: "visible",
  },
  exploreIcon: {
    transform: [{ rotate: "-30deg" }],
  },
  hiddenIcon: {
    opacity: 0,
  },
  icon: {
    color: "#62B278",
    fontSize: ICON_SIZE,
    fontWeight: "600",
    height: ICON_SIZE + 4,
    lineHeight: ICON_SIZE + 4,
    textAlign: "center",
    width: ICON_SIZE + 4,
  },
  root: {
    alignItems: "center",
    bottom: 16,
    left: 0,
    paddingHorizontal: 16,
    position: "absolute",
    right: 0,
    zIndex: 80,
  },
  surface: {
    alignItems: "center",
    backgroundColor: "#F8FFF7",
    borderRadius: NAVIGATION_BAR_HEIGHT / 2,
    elevation: 6,
    flexDirection: "row",
    height: NAVIGATION_BAR_HEIGHT,
    maxWidth: NAVIGATION_BAR_WIDTH,
    overflow: "visible",
    shadowColor: "#245434",
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    width: "100%",
  },
});

const NavigationBarMobile = memo(NavigationBarMobileComponent);

NavigationBarMobile.displayName = "NavigationBarMobile";

export { NavigationBarMobile };
export type { NavigationItemId, NavigationBarMobileProps };
