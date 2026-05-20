import {
  type AppDestination,
  type AppScreen,
  resolveAppDestination,
} from "@/navigation/core/destination";

const WEB_SCREEN_PATHS: Record<AppScreen, string> = {
  folders: "/folders",
  cardEdit: "/CardEdit",
  cardSetView: "/CardSetView",
  studyMode: "/study",
  uncertainMode: "/uncertain",
  bookmarkMode: "/bookmark",
  calendar: "/calendar",
  tasks: "/tasks",
  gallery: "/gallery",
  statistics: "/statistics",
  trash: "/trash",
};

export const toWebPath = (destination: AppDestination): string => {
  const query = destination.params
    ? new URLSearchParams(destination.params).toString()
    : "";

  if (destination.kind === "screen") {
    const basePath = WEB_SCREEN_PATHS[destination.screen];
    return query ? `${basePath}?${query}` : basePath;
  }

  return query
    ? `/${destination.sourceName}?${query}`
    : `/${destination.sourceName.toLowerCase()}`;
};

export const createPageUrl = (page: string | AppDestination): string => {
  return toWebPath(
    typeof page === "string" ? resolveAppDestination(page) : page,
  );
};

export { createAppDestination } from "@/navigation/core/destination";
