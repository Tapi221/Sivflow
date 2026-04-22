export type ExplorerSectionListNavigationReason = "titlebar-breadcrumb";

export type ExplorerSectionListNavigationDetail = {
  reason: ExplorerSectionListNavigationReason;
};

const EXPLORER_SECTION_LIST_NAVIGATION_EVENT = "folders:navigate-section-list";

export const requestSectionListNavigation = (
  detail: ExplorerSectionListNavigationDetail = {
    reason: "titlebar-breadcrumb",
  },
): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ExplorerSectionListNavigationDetail>(
      EXPLORER_SECTION_LIST_NAVIGATION_EVENT,
      {
        detail,
      },
    ),
  );
};

export const subscribeSectionListNavigation = (
  listener: (detail: ExplorerSectionListNavigationDetail) => void,
): (() => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleEvent = (event: Event): void => {
    if (!(event instanceof CustomEvent)) {
      return;
    }

    const detail = event.detail as ExplorerSectionListNavigationDetail | null;

    if (!detail) {
      return;
    }

    listener(detail);
  };

  window.addEventListener(
    EXPLORER_SECTION_LIST_NAVIGATION_EVENT,
    handleEvent as EventListener,
  );

  return () => {
    window.removeEventListener(
      EXPLORER_SECTION_LIST_NAVIGATION_EVENT,
      handleEvent as EventListener,
    );
  };
};
