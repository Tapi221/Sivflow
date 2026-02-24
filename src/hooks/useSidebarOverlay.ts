import { useCallback, useEffect, useRef, useState } from 'react';

type UseSidebarOverlayParams = {
  canUseSidebarNavUi: boolean;
  locationPathname: string;
  isSettingsOpen: boolean;
};

export function useSidebarOverlay({
  canUseSidebarNavUi,
  locationPathname,
  isSettingsOpen,
}: UseSidebarOverlayParams) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? saved === 'true' : true;
  });

  const handleSidebarToggle = useCallback((open: boolean) => {
    setIsSidebarOpen(open);
    localStorage.setItem('sidebarOpen', String(open));
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
    localStorage.setItem('sidebarOpen', 'false');
  }, []);

  const sidebarToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const sidebarPanelRef = useRef<HTMLElement | null>(null);
  const firstSidebarNavLinkRef = useRef<HTMLAnchorElement | null>(null);
  const wasSidebarOpenRef = useRef(isSidebarOpen);
  const previousPathnameRef = useRef(locationPathname);
  const previousBodyOverflowRef = useRef('');
  const previousHtmlOverflowRef = useRef('');

  useEffect(() => {
    if (!canUseSidebarNavUi) return;
    if (typeof document === 'undefined') return;

    const body = document.body;
    const html = document.documentElement;

    if (isSidebarOpen) {
      previousBodyOverflowRef.current = body.style.overflow;
      previousHtmlOverflowRef.current = html.style.overflow;
      body.style.overflow = 'hidden';
      html.style.overflow = 'hidden';

      requestAnimationFrame(() => {
        if (firstSidebarNavLinkRef.current) {
          firstSidebarNavLinkRef.current.focus();
          return;
        }
        sidebarPanelRef.current?.focus();
      });
    } else {
      body.style.overflow = previousBodyOverflowRef.current;
      html.style.overflow = previousHtmlOverflowRef.current;

      if (wasSidebarOpenRef.current) {
        sidebarToggleButtonRef.current?.focus();
      }
    }

    wasSidebarOpenRef.current = isSidebarOpen;

    return () => {
      body.style.overflow = previousBodyOverflowRef.current;
      html.style.overflow = previousHtmlOverflowRef.current;
    };
  }, [canUseSidebarNavUi, isSidebarOpen]);

  useEffect(() => {
    if (canUseSidebarNavUi) return;
    if (typeof document === 'undefined') return;
    const body = document.body;
    const html = document.documentElement;
    if (body.style.overflow === 'hidden' || html.style.overflow === 'hidden') {
      const previousBodyOverflow = previousBodyOverflowRef.current || '';
      const previousHtmlOverflow = previousHtmlOverflowRef.current || '';
      body.style.overflow = previousBodyOverflow;
      html.style.overflow = previousHtmlOverflow;
    }
  }, [canUseSidebarNavUi]);

  useEffect(() => {
    if (!canUseSidebarNavUi || !isSidebarOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      closeSidebar();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [canUseSidebarNavUi, closeSidebar, isSidebarOpen]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    closeSidebar();
  }, [closeSidebar, isSettingsOpen]);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = locationPathname;
    if (previousPathname === locationPathname) return;
    const timerId = window.setTimeout(() => {
      closeSidebar();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [closeSidebar, locationPathname]);

  return {
    isSidebarOpen,
    handleSidebarToggle,
    closeSidebar,
    sidebarToggleButtonRef,
    sidebarPanelRef,
    firstSidebarNavLinkRef,
  };
}
