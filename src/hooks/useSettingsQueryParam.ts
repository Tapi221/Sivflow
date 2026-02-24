import { useCallback } from 'react';
import type { SetURLSearchParams } from 'react-router-dom';

export function useSettingsQueryParam(
  searchParams: URLSearchParams,
  setSearchParams: SetURLSearchParams
) {
  const isSettingsOpen = searchParams.get('settings') === 'true';

  const setIsSettingsOpen = useCallback(
    (open: boolean) => {
      if (open && typeof document !== 'undefined') {
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLElement) {
          activeElement.blur();
        }
      }
      const newParams = new URLSearchParams(searchParams);
      if (open) {
        newParams.set('settings', 'true');
      } else {
        newParams.delete('settings');
      }
      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  return { isSettingsOpen, setIsSettingsOpen };
}
