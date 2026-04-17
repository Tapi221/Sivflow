import { useCallback } from "react";
import type { SetURLSearchParams } from "react-router-dom";
import {
  isSettingsTabParam,
  type SettingsTabParam,
} from "@constants/shared/settings";

export const useSettingsQueryParam = (
  searchParams: URLSearchParams,
  setSearchParams: SetURLSearchParams,
) => {
  const isSettingsOpen = searchParams.get("settings") === "true";
  const rawSettingsTab = searchParams.get("settingsTab");
  const settingsTab = isSettingsTabParam(rawSettingsTab)
    ? rawSettingsTab
    : undefined;

  const setIsSettingsOpen = useCallback(
    (open: boolean, tab?: SettingsTabParam) => {
      if (open && typeof document !== "undefined") {
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLElement) {
          activeElement.blur();
        }
      }

      const newParams = new URLSearchParams(searchParams);
      if (open) {
        newParams.set("settings", "true");
        if (tab) newParams.set("settingsTab", tab);
      } else {
        newParams.delete("settings");
        newParams.delete("settingsTab");
      }
      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return { isSettingsOpen, settingsTab, setIsSettingsOpen };
};