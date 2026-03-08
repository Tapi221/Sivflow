import { useEffect, useLayoutEffect, useRef } from "react";
import { useUserSettings } from "@/hooks/settings/useUserSettings";

// Helper to convert hex to RGB object
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 104, g: 154, b: 152 }; // Default primary color RGB
};

// Helper to mix colors in JS (Color mix fallback)
const mixColor = (
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number },
  weight: number,
) => {
  const w1 = weight;
  const w2 = 1 - weight;
  const r = Math.round(color1.r * w1 + color2.r * w2);
  const g = Math.round(color1.g * w1 + color2.g * w2);
  const b = Math.round(color1.b * w1 + color2.b * w2);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

const generatePalette = (baseHex: string) => {
  const base = hexToRgb(baseHex);
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };

  return {
    50: mixColor(white, base, 0.95),
    100: mixColor(white, base, 0.9),
    200: mixColor(white, base, 0.7),
    300: mixColor(white, base, 0.5),
    400: mixColor(white, base, 0.3),
    500: mixColor(white, base, 0.1),
    600: baseHex, // Base
    700: mixColor(black, base, 0.1),
    800: mixColor(black, base, 0.2),
    900: mixColor(black, base, 0.3),
  };
};

export function ThemeManager() {
  const { settings } = useUserSettings();
  const accentColor = settings?.accentColor || "#689A98"; // Default fallback
  const latestAccentRef = useRef(accentColor);

  const applyTheme = (nextAccent: string) => {
    const safeAccent = nextAccent || "#689A98";
    const root = document.documentElement;
    const rgb = hexToRgb(safeAccent);

    // Set Base RGB for Tailwind opacity (e.g. bg-primary-600/50)
    // The format must be "r g b" (space separated)
    root.style.setProperty("--color-primary-600", `${rgb.r} ${rgb.g} ${rgb.b}`);
    // Set Base Hex for non-Tailwind usage (e.g. Scrollbar)
    root.style.setProperty("--color-primary-600-hex", safeAccent);
    root.style.setProperty("--accent-color", safeAccent);

    const palette = generatePalette(safeAccent);

    // Set other shades as Hex strings
    root.style.setProperty("--color-primary-50", palette[50]);
    root.style.setProperty("--color-primary-100", palette[100]);
    root.style.setProperty("--color-primary-200", palette[200]);
    root.style.setProperty("--color-primary-300", palette[300]);
    root.style.setProperty("--color-primary-400", palette[400]);
    root.style.setProperty("--color-primary-500", palette[500]);
    // 600 is special (handled above)
    root.style.setProperty("--color-primary-700", palette[700]);
    root.style.setProperty("--color-primary-800", palette[800]);
    root.style.setProperty("--color-primary-900", palette[900]);

    // Update Meta Theme Color (for Safari/Mobile address bar)
    // We use the 50 shade for light background feel or white
    let metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }
    // Set to white or primary-50 depending on design preference.
    // User asked for "accent color at top" -> likely means the header color or status bar.
    // If header is white, this should be white. If header uses primary, this should use primary.
    // Our Layout header is bg-white. But let's check if user meant the Safe Area.
    // Usually matching the header background is safe.
    // However, if the user complained "accent color doesn't change", maybe they want the browser UI to match?
    // Let's set it to the accent color (or a dark shade) if they want it branded.
    // But typical modern apps use white/background color.
    // WAIT: User said "safariで表示した時画面上部のアクセントカラーが変更されない".
    // This implies they expect it TO CHANGE.
    // Let's set it to the accent color (base) or a lighter variant?
    // Actually, widespread practice is `theme-color` matches the header.
    // If the header is white, setting `theme-color` to accent might look odd unles header is also accent.
    // But maybe they refer to the "Status Bar" component I have?
    // Let's try setting it to `primary-50` (very light tint) to show *some* change, or the accent color itself if appropriate.
    // Let's default to the base accent color since they specifically asked about "accent color changing".
    // Actually, setting it to #ffffff is standard.
    // Let's look at StatusBar.tsx later.
    // For now, I will set meta theme-color to the `accentColor` itself (or maybe slightly darkened?)
    // to be very obvious that it has changed.
    metaThemeColor.setAttribute("content", safeAccent);

    // Save to localStorage for index.html head script to prevent green flash on reload
    localStorage.setItem("flashcard-accent-color", safeAccent);
  };

  // Paint前に反映（復帰直後の白飛び/無色化を減らす）
  useLayoutEffect(() => {
    const immediate =
      (typeof window !== "undefined" &&
        window.localStorage.getItem("flashcard-accent-color")) ||
      accentColor;
    latestAccentRef.current = immediate;
    applyTheme(immediate);
  }, [accentColor]);

  useEffect(() => {
    latestAccentRef.current = accentColor;
    applyTheme(accentColor);
  }, [accentColor]);

  // 最小化/非表示→再表示時に、CSS変数を念のため即再適用する
  useEffect(() => {
    const reapply = () => {
      const persisted = localStorage.getItem("flashcard-accent-color");
      const next = persisted || latestAccentRef.current || "#689A98";
      latestAccentRef.current = next;
      applyTheme(next);
    };

    const onVisibility = () => {
      if (!document.hidden) reapply();
    };

    window.addEventListener("focus", reapply);
    window.addEventListener("pageshow", reapply);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", reapply);
      window.removeEventListener("pageshow", reapply);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [accentColor]);

  return null;
}







