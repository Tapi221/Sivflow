export type AppScreen =
  | "folders"
  | "cardEdit"
  | "cardSetView"
  | "studyMode"
  | "uncertainMode"
  | "bookmarkMode"
  | "calendar"
  | "gallery"
  | "oneQaMode"
  | "pairMode"
  | "fourChoiceMode"
  | "statistics"
  | "trash";

export type AppDestination =
  | {
      kind: "screen";
      screen: AppScreen;
      params?: Record<string, string>;
      sourceName: string;
    }
  | {
      kind: "unknown";
      sourceName: string;
      params?: Record<string, string>;
    };

const parseQueryParams = (query: string | undefined) => {
  if (!query) return undefined;

  const params = Object.fromEntries(new URLSearchParams(query).entries());
  return Object.keys(params).length > 0 ? params : undefined;
};

const splitPageName = (pageName: string) => {
  const [sourceName, ...queryParts] = pageName.split("?");
  return {
    sourceName,
    query: queryParts.length > 0 ? queryParts.join("?") : undefined,
  };
};

const PAGE_NAME_ALIASES: Record<string, AppScreen> = {
  Dashboard: "folders",
  dashboard: "folders",
  Folders: "folders",
  folders: "folders",
  CardEdit: "cardEdit",
  CardSetView: "cardSetView",
  cardsetview: "cardSetView",
  CardView: "cardSetView",
  cardview: "cardSetView",
  StudyMode: "studyMode",
  study: "studyMode",
  UncertainMode: "uncertainMode",
  uncertain: "uncertainMode",
  BookmarkMode: "bookmarkMode",
  bookmark: "bookmarkMode",
  Calendar: "calendar",
  calendar: "calendar",
  Gallery: "gallery",
  gallery: "gallery",
  OneQAMode: "oneQaMode",
  PairMode: "pairMode",
  FourChoiceMode: "fourChoiceMode",
  Statistics: "statistics",
  Trash: "trash",
};

export const resolveAppDestination = (pageName: string): AppDestination => {
  const { sourceName, query } = splitPageName(pageName);
  const screen = PAGE_NAME_ALIASES[sourceName];
  const params = parseQueryParams(query);

  if (screen) {
    return {
      kind: "screen",
      screen,
      params,
      sourceName,
    };
  }

  return {
    kind: "unknown",
    sourceName,
    params,
  };
};

export const createAppDestination = (
  screen: AppScreen,
  params?: Record<string, string | number | boolean | null | undefined>,
): AppDestination => {
  const normalizedParams = params
    ? Object.fromEntries(
        Object.entries(params)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, String(value)]),
      )
    : undefined;

  return {
    kind: "screen",
    screen,
    sourceName: screen,
    params:
      normalizedParams && Object.keys(normalizedParams).length > 0
        ? normalizedParams
        : undefined,
  };
};
