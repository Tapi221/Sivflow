type LibraryContentType = "pdf" | "flashcards";



const LIBRARY_ROOT_PATH = "/library";
const LIBRARY_PDF_PATH = "/library/pdf";
const LIBRARY_FLASHCARD_PATH = "/library/flashcard";



const normalizePathname = (pathname: string): string => {
  const normalized = pathname.toLowerCase().replace(/\/+$/, "");
  return normalized ?? "/";
};
const resolveLibraryTypeFromPathname = (pathname: string): LibraryContentType | null => {
  switch (normalizePathname(pathname)) { case LIBRARY_PDF_PATH: return "pdf";
    case LIBRARY_FLASHCARD_PATH:
    case "/library/flashcards":
      return "flashcards";
    default:
      return null;
  }
};
const resolveLibraryTypeFromSearchParams = (searchParams: URLSearchParams): LibraryContentType | null => {
  const libraryType = searchParams.get("libraryType");

  if (libraryType === "pdf") return "pdf";
  if (libraryType === "flashcard" || libraryType === "flashcards") {
    return "flashcards";
  }

  return null;
};
const resolveLibraryTypeFromLocation = (pathname: string, searchParams: URLSearchParams): LibraryContentType | null => {
  return (resolveLibraryTypeFromPathname(pathname) ?? resolveLibraryTypeFromSearchParams(searchParams));
};
const isLibraryPathname = (pathname: string): boolean => {
  const normalizedPathname = normalizePathname(pathname);

  return (
    normalizedPathname === LIBRARY_ROOT_PATH ||
    resolveLibraryTypeFromPathname(normalizedPathname) !== null
  );
};
const buildLibraryTypePath = (libraryType: string): string => {
  if (libraryType === "pdf") return LIBRARY_PDF_PATH;
  if (libraryType === "flashcard" || libraryType === "flashcards") {
    return LIBRARY_FLASHCARD_PATH;
  }

  return LIBRARY_ROOT_PATH;
};



export { LIBRARY_ROOT_PATH, LIBRARY_PDF_PATH, LIBRARY_FLASHCARD_PATH, resolveLibraryTypeFromPathname, resolveLibraryTypeFromSearchParams, resolveLibraryTypeFromLocation, isLibraryPathname, buildLibraryTypePath };


export type { LibraryContentType };
