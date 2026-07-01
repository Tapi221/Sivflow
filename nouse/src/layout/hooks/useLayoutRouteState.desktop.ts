import { useLocation } from "react-router-dom";



const useLayoutRouteStateDesktop = () => {
  const { pathname } = useLocation();

  const isLibraryRoute = /^\/library(?:\/|$)/i.test(pathname);

  const isFoldersRoute = /^\/folders(?:\/|$)/i.test(pathname);

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
    isFoldersRoute,
    isLibraryRoute,
    isScheduleRoute,
    isCardSetViewRoute,
    isCardEditRoute,
    isStudyRoute,
    isScrollLocked,
  };
};



export { useLayoutRouteStateDesktop };
