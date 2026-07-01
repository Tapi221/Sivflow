import { uniReactRoot } from '@affine/component';
import { useResponsiveSidebar } from '@affine/core/components/hooks/use-responsive-siedebar';
import { SWRConfigProvider } from '@affine/core/components/providers/swr-config-provider';
import { AppContainer } from '@affine/core/desktop/components/app-container';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { LiveData, useLiveData, useService } from '@toeverything/infra';
import {
  lazy,
  Suspense,
  type ComponentType,
  type PropsWithChildren,
} from 'react';

const AIIsland = lazy(() =>
  import('@affine/core/desktop/components/ai-island').then(module => ({
    default: module.AIIsland,
  }))
);
const AiLoginRequiredModal = lazy(() =>
  import('@affine/core/components/affine/auth/ai-login-required').then(
    module => ({
      default: module.AiLoginRequiredModal,
    })
  )
);
const DocumentTitle = lazy(() =>
  import('@affine/core/desktop/components/document-title').then(module => ({
    default: module.DocumentTitle,
  }))
);
const WorkspaceDialogs = lazy(() =>
  import('@affine/core/desktop/dialogs').then(module => ({
    default: module.WorkspaceDialogs,
  }))
);
const WorkspaceSideEffects = lazy(() =>
  import('@affine/core/components/providers/workspace-side-effects').then(
    module => ({
      default: module.WorkspaceSideEffects,
    })
  )
);
const PeekViewManagerModal = lazy(() =>
  import('@affine/core/modules/peek-view').then(module => ({
    default: module.PeekViewManagerModal,
  }))
);
const QuotaCheck = lazy(() =>
  import('@affine/core/modules/quota').then(module => ({
    default: module.QuotaCheck,
  }))
);

const Deferred = <Props extends object>({
  Component,
  ...props
}: {
  Component: ComponentType<Props>;
} & Props) => {
  return (
    <Suspense fallback={null}>
      <Component {...props} />
    </Suspense>
  );
};

export const WorkspaceLayout = function WorkspaceLayout({
  children,
}: PropsWithChildren) {
  const currentWorkspace = useService(WorkspaceService).workspace;
  return (
    <SWRConfigProvider>
      <Deferred Component={WorkspaceDialogs} />

      {/* ---- some side-effect components ---- */}
      {currentWorkspace?.flavour !== 'local' ? (
        <Deferred
          Component={QuotaCheck}
          workspaceMeta={currentWorkspace.meta}
        />
      ) : null}
      <Deferred Component={AiLoginRequiredModal} />
      <Deferred Component={WorkspaceSideEffects} />
      <Deferred Component={PeekViewManagerModal} />
      <Deferred Component={DocumentTitle} />

      <WorkspaceLayoutInner>{children}</WorkspaceLayoutInner>
      {/* should show after workspace loaded */}
      {/* FIXME: wait for better ai, <WorkspaceAIOnboarding /> */}
      <Deferred Component={AIIsland} />
      <uniReactRoot.Root />
    </SWRConfigProvider>
  );
};

/**
 * Wraps the workspace layout main router view
 */
const WorkspaceLayoutUIContainer = ({ children }: PropsWithChildren) => {
  const workbench = useService(WorkbenchService).workbench;
  const currentPath = useLiveData(
    LiveData.computed(get => {
      return get(workbench.basename$) + get(workbench.location$).pathname;
    })
  );
  useResponsiveSidebar();

  return (
    <AppContainer data-current-path={currentPath}>{children}</AppContainer>
  );
};
const WorkspaceLayoutInner = ({ children }: PropsWithChildren) => {
  return <WorkspaceLayoutUIContainer>{children}</WorkspaceLayoutUIContainer>;
};
