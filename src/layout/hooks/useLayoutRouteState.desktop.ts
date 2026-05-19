import { useLocation } from "react-router-dom";

export const useLayoutRouteStateDesktop = () => {
  const { pathname } = useLocation();

  const isFoldersRoute = /^\/folders(?:\/|$)/i.test(pathname);

  const isCardSetViewRoute = /^\/(?:cardsetview|cardview)(?:\/|$)/i.test(
    pathname,
  );

  const isCardEditRoute = /^\/cardedit(?:\/|$)/i.test(pathname);

  const isStudyRoute = /^\/study(?:\/|$)/i.test(pathname);

  const isScrollLocked =
    isFoldersRoute || isCardEditRoute || isCardSetViewRoute || isStudyRoute;

  return {
    pathname,

    isFoldersRoute,

    isCardSetViewRoute,

    isCardEditRoute,

    isStudyRoute,

    isScrollLocked,
  };
};
