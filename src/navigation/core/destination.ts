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
      query?: string;
      sourceName: string;
    }
  | {
      kind: "unknown";
      sourceName: string;
      query?: string;
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
  const [sourceName, ...queryParts] = pageName.split("?");
  const query = queryParts.length > 0 ? queryParts.join("?") : undefined;
  const screen = PAGE_NAME_ALIASES[sourceName];

  if (screen) {
    return {
      kind: "screen",
      screen,
      query,
      sourceName,
    };
  }

  return {
    kind: "unknown",
    sourceName,
    query,
  };
};
