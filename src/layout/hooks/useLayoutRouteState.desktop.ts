import { useLocation } from "react-router-dom";

export const useLayoutRouteStateDesktop = () => {
  const { pathname } = useLocation();

  const isLibraryRoute = /^\/library(?:\/|$)/i.test(pathname);

  const isScheduleRoute = /^\/(?:schedule|calendar|tasks)(?:\/|$)/i.test(
    pathname,
  );

  const isCardSetViewRoute = /^\/(?:cardsetview|cardview)(?:\/|$)/i.test(
    pathname,
  );

  const isCardEditRoute = /^\/cardedit(?:\/|$)/i.test(pathname);

  const isStudyRoute = /^\/study(?:\/|$)/i.test(pathname);

  const isScrollLocked =
    isLibraryRoute ||
    isScheduleRoute ||
    isCardEditRoute ||
    isCardSetViewRoute ||
    isStudyRoute;

  return {
    pathname,
    isFoldersRoute: isLibraryRoute,
    isLibraryRoute,
    isScheduleRoute,
    isCardSetViewRoute,
    isCardEditRoute,
    isStudyRoute,
    isScrollLocked,
  };
};
