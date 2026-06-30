import { DefaultServerService } from '@affine/core/modules/cloud';
import { DesktopApiService } from '@affine/core/modules/desktop-api';
import { WorkspacesService } from '@affine/core/modules/workspace';
import {
  buildShowcaseWorkspace,
  createFirstAppData,
} from '@affine/core/utils/first-app-data';
import { ServerFeature } from '@affine/graphql';
import {
  useLiveData,
  useService,
  useServiceOptional,
} from '@toeverything/infra';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  RouteLogic,
  useNavigateHelper,
} from '../../../components/hooks/use-navigate-helper';
import { WorkspaceNavigator } from '../../../components/workspace-selector';
import { AuthService } from '../../../modules/cloud';
import { hasPendingFirebaseRedirectSignIn } from '../../../modules/cloud/utils/firebase-auth';
import { AppContainer } from '../../components/app-container';

/**
 * index page
 *
 * query string:
 * - initCloud: boolean, true の場合、ユーザーがログイン済みなら cloud workspace を作成する
 */
export const Component = ({
  defaultIndexRoute = 'all',
  children,
  fallback,
}: {
  defaultIndexRoute?: string;
  children?: ReactNode;
  fallback?: ReactNode;
}) => {
  // 遷移や作成には時間がかかる可能性があるため、ちらつきを避ける目的で workspace fallback を表示する
  const [navigating, setNavigating] = useState(true);
  const [creating, setCreating] = useState(false);
  const authService = useService(AuthService);
  const defaultServerService = useService(DefaultServerService);

  const loggedIn = useLiveData(
    authService.session.status$.map(s => s === 'authenticated')
  );
  const authRevalidating = useLiveData(authService.session.isRevalidating$);
  const enableLocalWorkspace =
    useLiveData(
      defaultServerService.server.config$.selector(
        c =>
          c.features.includes(ServerFeature.LocalWorkspace) ||
          BUILD_CONFIG.isNative
      )
    ) ?? true;

  const workspacesService = useService(WorkspacesService);
  const list = useLiveData(workspacesService.list.workspaces$);
  const listIsLoading = useLiveData(workspacesService.list.isRevalidating$);

  const { openPage, jumpToPage, jumpToSignIn } = useNavigateHelper();
  const [searchParams] = useSearchParams();

  const createOnceRef = useRef(false);

  const createCloudWorkspace = useCallback(() => {
    if (createOnceRef.current) return;
    createOnceRef.current = true;
    // TODO: selfhosted をサポートする
    buildShowcaseWorkspace(workspacesService, 'affine-cloud', 'AFFiNE Cloud')
      .then(({ meta, defaultDocId }) => {
        if (defaultDocId) {
          jumpToPage(meta.id, defaultDocId);
        } else {
          openPage(meta.id, defaultIndexRoute);
        }
      })
      .catch(err => {
        createOnceRef.current = false;
        setNavigating(false);
        console.error('Failed to create cloud workspace', err);
      });
  }, [defaultIndexRoute, jumpToPage, openPage, workspacesService]);

  useLayoutEffect(() => {
    if (!navigating) {
      return;
    }

    if (listIsLoading) {
      return;
    }

    if (!enableLocalWorkspace && !loggedIn) {
      localStorage.removeItem('last_workspace_id');
      jumpToSignIn();
      return;
    }

    // ユーザーがログイン済みで、cloud workspace を持っているか確認する
    if (searchParams.get('initCloud') === 'true') {
      if (loggedIn) {
        if (list.every(w => w.flavour !== 'affine-cloud')) {
          createCloudWorkspace();
          return;
        }

        // 最初の cloud workspace を開く
        const openWorkspace =
          list.find(w => w.flavour === 'affine-cloud') ?? list[0];
        openPage(openWorkspace.id, defaultIndexRoute);
      } else {
        if (authRevalidating || hasPendingFirebaseRedirectSignIn()) {
          authService.session.revalidate();
          return;
        }

        jumpToSignIn('/?initCloud=true', RouteLogic.REPLACE);
        return;
      }
    } else {
      if (list.length === 0) {
        setNavigating(false);
        return;
      }
      // 最後に使った workspace を開く
      const lastId = localStorage.getItem('last_workspace_id');

      const openWorkspace = list.find(w => w.id === lastId) ?? list[0];
      openPage(openWorkspace.id, defaultIndexRoute, RouteLogic.REPLACE);
    }
  }, [
    enableLocalWorkspace,
    createCloudWorkspace,
    list,
    openPage,
    searchParams,
    jumpToSignIn,
    listIsLoading,
    loggedIn,
    authRevalidating,
    navigating,
    defaultIndexRoute,
    authService,
  ]);

  const desktopApi = useServiceOptional(DesktopApiService);

  useEffect(() => {
    desktopApi?.handler.ui.pingAppLayoutReady().catch(console.error);
  }, [desktopApi]);

  useEffect(() => {
    if (listIsLoading || list.length > 0 || !enableLocalWorkspace) {
      return;
    }

    createFirstAppData(workspacesService)
      .then(createdWorkspace => {
        if (createdWorkspace) {
          if (createdWorkspace.defaultPageId) {
            jumpToPage(
              createdWorkspace.meta.id,
              createdWorkspace.defaultPageId
            );
          } else {
            openPage(createdWorkspace.meta.id, 'all');
          }
        }
      })
      .catch(err => {
        console.error('Failed to create first app data', err);
      })
      .finally(() => {
        setCreating(false);
      });
  }, [
    jumpToPage,
    jumpToSignIn,
    openPage,
    workspacesService,
    loggedIn,
    listIsLoading,
    list,
    enableLocalWorkspace,
  ]);

  if (navigating || creating) {
    return fallback ?? <AppContainer fallback />;
  }

  // TODO(@eyhn): workspace がない場合のページが必要
  return (
    children ?? (
      <div
        style={{
          position: 'fixed',
          left: 'calc(50% - 150px)',
          top: '50%',
        }}
      >
        <WorkspaceNavigator
          open={true}
          menuContentOptions={{
            forceMount: true,
          }}
        />
      </div>
    )
  );
};
