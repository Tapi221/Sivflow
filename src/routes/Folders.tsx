import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { FoldersScreen } from "@/features/explorer";
import { useFoldersRouteAdapter } from "@/features/explorer/adapters/web/useFoldersRouteAdapter";

const Folders = () => {
  const route = useFoldersRouteAdapter();
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);

    if (
      location.pathname === "/folders" &&
      searchParams.get("view") === "section-list"
    ) {
      window.history.replaceState(window.history.state, "", "/library");
    }
  }, [location.pathname, location.search]);

  return <FoldersScreen route={route} />;
};

export default Folders;
