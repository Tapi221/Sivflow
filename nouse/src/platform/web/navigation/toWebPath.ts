type LegacyDestinationParams = Record<string, string | number | boolean | null | undefined>;
type LegacyDestination = {
  screen?: string;
  params?: LegacyDestinationParams;
};



const SCHEDULE_PATH = "/schedule";



const appendSearchParams = (path: string, params?: LegacyDestinationParams): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
};
const toWebPath = (destination: LegacyDestination): string => {
  if (destination.screen === "cardSetView") {
    return appendSearchParams(SCHEDULE_PATH, destination.params);
  }
  return appendSearchParams(SCHEDULE_PATH, destination.params);
};
const createPageUrl = (page: string | LegacyDestination): string => {
  if (typeof page === "string") {
    return page;
  }
  return toWebPath(page);
};
const createAppDestination = (screen: string, params?: LegacyDestinationParams): LegacyDestination => {
  return { screen, params };
};



export { toWebPath, createPageUrl, createAppDestination };
