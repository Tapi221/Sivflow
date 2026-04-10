import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useSettingsQueryParam } from "@/hooks/settings/useSettingsQueryParam";

export const useExplorerSettingsOpener = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setIsSettingsOpen } = useSettingsQueryParam(
    searchParams,
    setSearchParams,
  );

  return useCallback(() => {
    setIsSettingsOpen(true);
  }, [setIsSettingsOpen]);
};
