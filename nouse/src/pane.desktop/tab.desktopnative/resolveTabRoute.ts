import type { WorkspaceTab } from "./Tab";



const encodeRouteSegment = encodeURIComponent;



const resolveWorkspaceTabRoute = (tab: WorkspaceTab): string => {
  switch (tab.kind) {
    case "route":
      return tab.routePath;

    case "explorer":
      return `/library/explorer/${encodeRouteSegment(tab.id.slice(9))}`;

    case "document":
      return `/library/documents/${encodeRouteSegment(tab.documentId)}`;

    case "card":
      return `/library/cards/${encodeRouteSegment(tab.cardId)}`;

    case "note":
      return `/library/notes/${encodeRouteSegment(tab.noteId)}`;
  }
};



export { resolveWorkspaceTabRoute };
