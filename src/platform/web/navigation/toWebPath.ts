type LegacyDestinationParams = Record<string, string | number | boolean | null | undefined>;
type LegacyDestination = {
  params?: LegacyDestinationParams;
};



const SCHEDULE_PATH = "/schedule";



const toWebPath = (_destination: LegacyDestination): string => {
  return SCHEDULE_PATH;
};
const createPageUrl = (_page: string | LegacyDestination): string => {
  return SCHEDULE_PATH;
};
const createAppDestination = (_screen: string, params?: LegacyDestinationParams): LegacyDestination => {
  return { params };
};



export { toWebPath, createPageUrl, createAppDestination };
