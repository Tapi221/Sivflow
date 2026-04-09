import {
  resolveAppDestination,
  type AppDestination,
  type AppScreen,
} from "@/navigation/core/destination";

const WEB_SCREEN_PATHS: Record<AppScreen, string> = {
  folders: "/folders",
  cardEdit: "/CardEdit",
  cardSetView: "/CardSetView",
  studyMode: "/study",
  uncertainMode: "/uncertain",
  bookmarkMode: "/bookmark",
  calendar: "/calendar",
  gallery: "/gallery",
  oneQaMode: "/one-qa-mode",
  pairMode: "/pair-mode",
  fourChoiceMode: "/four-choice-mode",
  statistics: "/statistics",
  trash: "/trash",
};

export const toWebPath = (destination: AppDestination): string => {
  if (destination.kind === "screen") {
    const basePath = WEB_SCREEN_PATHS[destination.screen];
    return destination.query ? `${basePath}?${destination.query}` : basePath;
  }

  return destination.query
    ? `/${destination.sourceName}?${destination.query}`
    : `/${destination.sourceName.toLowerCase()}`;
};

export const createPageUrl = (pageName: string): string => {
  return toWebPath(resolveAppDestination(pageName));
};
