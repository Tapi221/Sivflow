export const DESKTOP_MIN_WIDTH = 1024;

export const isDesktopWidth = (width: number): boolean =>
  width >= DESKTOP_MIN_WIDTH;

export const getIsDesktop = (): boolean => {
  if (typeof window === "undefined") return false;
  return isDesktopWidth(window.innerWidth);
};

export const getDesktopMediaQuery = (): MediaQueryList | null => {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  return window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);
};




