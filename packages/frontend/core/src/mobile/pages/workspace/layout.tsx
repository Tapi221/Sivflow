import { uniReactRoot } from "@affine/component";
import { AffineErrorBoundary } from "@affine/core/components/affine/affine-error-boundary";
import { AiLoginRequiredModal } from "@affine/core/components/affine/auth/ai-login-required";
import { SWRConfigProvider } from "@affine/core/components/providers/swr-config-provider";
import { WorkspaceSideEffects } from "@affine/core/components/providers/workspace-side-effects";
import {
  DefaultServerService,
  WorkspaceServerService,
} from "@affine/core/modules/cloud";
import { GlobalContextService } from "@affine/core/modules/global-context";
import { PeekViewManagerModal } from "@affine/core/modules/peek-view";
import type {
  Workspace,
  WorkspaceMetadata,
} from "@affine/core/modules/workspace";
import {
  workspaceRootDocRenderable$,
  WorkspacesService,
} from "@affine/core/modules/workspace";
import {
  FrameworkScope,
  LiveData,
  useLiveData,
  useServices,
} from "@toeverything/infra";
import {
  type PropsWithChildren,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import { AppFallback } from "../../components/app-fallback";
import { WorkspaceDialogs } from "../../dialogs";

// TODO(@forehalo): [core/electron] とグローバル context を再利用する
declare global {
  /**
   * @internal デバッグ専用
   */
  // oxlint-disable-next-line no-var
  var currentWorkspace: Workspace | undefined;
  // oxlint-disable-next-line no-var
  var exportWorkspaceSnapshot: (docs?: string[]) => Promise<void>;
  // oxlint-disable-next-line no-var
  var importWorkspaceSnapshot: () => Promise<void>;
  interface WindowEventMap {
    "affine:workspace:change": CustomEvent<{ id: string }>;
  }
}

export const WorkspaceLayout = ({
  meta,
  children,
}: PropsWithChildren<{ meta: WorkspaceMetadata }>) => {
  // todo: packages\frontend\core\src\pages\workspace\index.tsx とのコード重複を減らす
  const { workspacesService, globalContextService, defaultServerService } =
    useServices({
      WorkspacesService,
      GlobalContextService,
      DefaultServerService,
    });

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const workspaceServer = workspace?.scope.get(WorkspaceServerService)?.server;

  useLayoutEffect(() => {
    const ref = workspacesService.open({ metadata: meta });
    setWorkspace(ref.workspace);
    return () => {
      ref.dispose();
    };
  }, [meta, workspacesService]);

  useEffect(() => {
    if (workspace) {
      // デバッグ用途
      window.currentWorkspace = workspace ?? undefined;
      window.dispatchEvent(
        new CustomEvent("affine:workspace:change", {
          detail: {
            id: workspace.id,
          },
        }),
      );
      localStorage.setItem("last_workspace_id", workspace.id);
      globalContextService.globalContext.workspaceId.set(workspace.id);
      if (workspaceServer) {
        globalContextService.globalContext.serverId.set(workspaceServer.id);
      }
      globalContextService.globalContext.workspaceFlavour.set(
        workspace.flavour,
      );
      return () => {
        window.currentWorkspace = undefined;
        globalContextService.globalContext.workspaceId.set(null);
        if (workspaceServer) {
          globalContextService.globalContext.serverId.set(
            defaultServerService.server.id,
          );
        }
        globalContextService.globalContext.workspaceFlavour.set(null);
      };
    }
    return;
  }, [
    defaultServerService.server.id,
    globalContextService,
    workspace,
    workspaceServer,
  ]);

  const rootDocReady$ = useMemo(
    () =>
      workspace
        ? LiveData.from(workspaceRootDocRenderable$(workspace), false)
        : null,
    [workspace],
  );
  const rootDocReady = useLiveData(rootDocReady$) ?? false;

  if (!workspace) {
    return null; // layout effect で workspace が設定されるため、ここではスキップする
  }

  // Local workspaces should render their shell immediately and hydrate in place.
  const isRootDocReady = workspace.flavour === "local" || rootDocReady;

  if (!isRootDocReady) {
    return <AppFallback />;
  }

  return (
    <FrameworkScope scope={workspaceServer?.scope}>
      <FrameworkScope scope={workspace.scope}>
        <AffineErrorBoundary height="100dvh">
          <SWRConfigProvider>
            <WorkspaceDialogs />

            {/* ---- 副作用を持つコンポーネント群 ---- */}
            <PeekViewManagerModal />
            <AiLoginRequiredModal />
            <uniReactRoot.Root />
            <WorkspaceSideEffects />
            {children}
          </SWRConfigProvider>
        </AffineErrorBoundary>
      </FrameworkScope>
    </FrameworkScope>
  );
};
