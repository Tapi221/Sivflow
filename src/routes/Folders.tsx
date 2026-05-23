import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { FoldersScreen } from "@/features/explorer";
import { useFoldersRouteAdapter } from "@/features/explorer/adapters/web/useFoldersRouteAdapter";

const Folders = () => {
  const route = useFoldersRouteAdapter();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);

    if (
      location.pathname === "/folders" &&
      searchParams.get("view") === "section-list"
    ) {
      navigate("/library", { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  return <FoldersScreen route={route} />;
};

export default Folders;
