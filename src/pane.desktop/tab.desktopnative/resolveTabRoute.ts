import type { WorkspaceTab as T } from "./Tab";

const e = encodeURIComponent;

const resolveWorkspaceTabRoute = (t: T) => t.kind === "route" ? t.routePath : t.kind === "explorer" ? "/library/explorer/" + e(t.id.slice(9)) : t.kind === "document" ? "/library/documents/" + e(t.documentId) : "/library/cards/" + e(t.cardId);

export { resolveWorkspaceTabRoute };
