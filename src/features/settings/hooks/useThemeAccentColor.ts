import { useEffect } from "react";
import { createThemeAccentCssVariables, normalizeThemeAccentColor } from "@/features/settings/themeAccent";
import { useUserSettings } from "@/features/settings/hooks/useUserSettings";

const useThemeAccentColor = () => {
  const { settings } = useUserSettings();
  const accentColor = normalizeThemeAccentColor(settings?.accentColor);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const variables = createThemeAccentCssVariables(accentColor);
    Object.entries(variables).forEach(([name, value]) => {
      root.style.setProperty(name, value);
    });
    return () => {
      Object.keys(variables).forEach((name) => {
        root.style.removeProperty(name);
      });
    };
  }, [accentColor]);
};

export { useThemeAccentColor };
