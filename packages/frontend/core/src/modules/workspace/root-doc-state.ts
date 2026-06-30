import type { DocFrontendDocState } from "@affine/nbstore";
import { map } from "rxjs";

import type { Workspace } from "./entities/workspace";

export function isWorkspaceRootDocRenderable(
  workspace: Pick<Workspace, "flavour">,
  state: Pick<DocFrontendDocState, "loaded" | "ready">,
) {
  // Local workspaces may be intentionally empty, so a completed load is enough
  // to render the shell and let the user create their first doc.
  return state.ready || (workspace.flavour === "local" && state.loaded);
}

export function workspaceRootDocRenderable$(workspace: Workspace) {
  return workspace.engine.doc
    .docState$(workspace.id)
    .pipe(map((state) => isWorkspaceRootDocRenderable(workspace, state)));
}
