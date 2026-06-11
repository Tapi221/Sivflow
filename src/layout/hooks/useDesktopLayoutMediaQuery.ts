import { useEffect, useState } from "react";



const DESKTOP_LAYOUT_BREAKPOINT_PX = 768;
const DESKTOP_LAYOUT_MEDIA_QUERY = `(min-width: ${DESKTOP_LAYOUT_BREAKPOINT_PX}px)`;



const getMatchesDesktopLayoutMediaQuery = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;

  return window.matchMedia(DESKTOP_LAYOUT_MEDIA_QUERY).matches;
};
const useDesktopLayoutMediaQuery = () => {
  const [matchesDesktopLayout, setMatchesDesktopLayout] = useState(getMatchesDesktopLayoutMediaQuery);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mediaQueryList = window.matchMedia(DESKTOP_LAYOUT_MEDIA_QUERY);
    const updateMatchesDesktopLayout = () => {
      setMatchesDesktopLayout(mediaQueryList.matches);
    };

    updateMatchesDesktopLayout();
    mediaQueryList.addEventListener("change", updateMatchesDesktopLayout);

    return () => {
      mediaQueryList.removeEventListener("change", updateMatchesDesktopLayout);
    };
  }, []);

  return matchesDesktopLayout;
};



export { DESKTOP_LAYOUT_BREAKPOINT_PX, DESKTOP_LAYOUT_MEDIA_QUERY, useDesktopLayoutMediaQuery };
