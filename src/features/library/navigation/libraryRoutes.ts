export type LibraryContentType = "pdf" | "flashcards";

export const LIBRARY_ROOT_PATH = "/library";
export const LIBRARY_PDF_PATH = "/library/pdf";
export const LIBRARY_FLASHCARD_PATH = "/library/flashcard";

const normalizePathname = (pathname: string): string => {
  const normalized = pathname.toLowerCase().replace(/\/+$/, "");
  return normalized || "/";
};

export const resolveLibraryTypeFromPathname = (
  pathname: string,
): LibraryContentType | null => {
  switch (normalizePathname(pathname)) {
    case LIBRARY_PDF_PATH:
      return "pdf";
    case LIBRARY_FLASHCARD_PATH:
    case "/library/flashcards":
      return "flashcards";
    default:
      return null;
  }
};

export const resolveLibraryTypeFromSearchParams = (
  searchParams: URLSearchParams,
): LibraryContentType | null => {
  const libraryType = searchParams.get("libraryType");

  if (libraryType === "pdf") return "pdf";
  if (libraryType === "flashcard" || libraryType === "flashcards") {
    return "flashcards";
  }

  return null;
};

export const resolveLibraryTypeFromLocation = (
  pathname: string,
  searchParams: URLSearchParams,
): LibraryContentType | null => {
  return (
    resolveLibraryTypeFromPathname(pathname) ??
    resolveLibraryTypeFromSearchParams(searchParams)
  );
};

export const isLibraryPathname = (pathname: string): boolean => {
  const normalizedPathname = normalizePathname(pathname);

  return (
    normalizedPathname === LIBRARY_ROOT_PATH ||
    resolveLibraryTypeFromPathname(normalizedPathname) !== null
  );
};

export const buildLibraryTypePath = (libraryType: string): string => {
  if (libraryType === "pdf") return LIBRARY_PDF_PATH;
  if (libraryType === "flashcard" || libraryType === "flashcards") {
    return LIBRARY_FLASHCARD_PATH;
  }

  return LIBRARY_ROOT_PATH;
};
