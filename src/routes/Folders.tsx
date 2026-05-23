import { FoldersScreen } from "@/features/explorer";
import { useFoldersRouteAdapter } from "@/features/explorer/adapters/web/useFoldersRouteAdapter";

const Folders = () => {
  const route = useFoldersRouteAdapter();

  return <FoldersScreen route={route} />;
};

export default Folders;
