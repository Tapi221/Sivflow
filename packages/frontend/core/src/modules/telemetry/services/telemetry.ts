import { shallowEqual } from '@affine/component';
import { DebugLogger } from '@affine/debug';
import { ServerDeploymentType } from '@affine/graphql';
import { flushTelemetry, setTelemetryContext, tracker } from '@affine/track';
import { LiveData, OnEvent, Service } from '@toeverything/infra';

import type { AuthAccountInfo, Server, ServersService } from '../../cloud';
import { getOfficialTelemetryEndpoint } from '../../cloud/constant';
import type { GlobalContextService } from '../../global-context';
import { ApplicationStarted } from '../../lifecycle';

const logger = new DebugLogger('telemetry-service');

type TrackTelemetryChannel = NonNullable<
  Parameters<typeof setTelemetryContext>[0]['channel']
>;

type GlobalWithBuildConfig = typeof globalThis & {
  BUILD_CONFIG?: Partial<BUILD_CONFIG_TYPE>;
};

const trackTelemetryChannels = new Set<TrackTelemetryChannel>([
  'stable',
  'beta',
  'internal',
  'local',
]);

function readGlobalBuildConfig(): Partial<BUILD_CONFIG_TYPE> | undefined {
  try {
    if (typeof BUILD_CONFIG !== 'undefined') {
      return BUILD_CONFIG;
    }
  } catch {
    // BUILD_CONFIG が未注入の環境では globalThis 側の確認に進む
  }

  return (globalThis as GlobalWithBuildConfig).BUILD_CONFIG;
}

function resolveTelemetryChannel(): TrackTelemetryChannel {
  const channel = readGlobalBuildConfig()?.appBuildType;

  return trackTelemetryChannels.has(channel as TrackTelemetryChannel)
    ? (channel as TrackTelemetryChannel)
    : 'stable';
}

@OnEvent(ApplicationStarted, e => e.onApplicationStart)
export class TelemetryService extends Service {
  private readonly disposableFns: (() => void)[] = [];

  private readonly currentAccount$ =
    this.globalContextService.globalContext.serverId.$.selector(id =>
      id
        ? this.serversService.server$(id)
        : new LiveData<Server | undefined>(undefined)
    )
      .flat()
      .selector(
        server =>
          [
            server?.account$,
            server?.config$.selector(
              c => c.type === ServerDeploymentType.Selfhosted
            ),
          ] as const
      )
      .flat()
      .map(([account, selfHosted]) => ({
        account,
        selfHosted,
      }))
      .distinctUntilChanged(shallowEqual);

  constructor(
    private readonly globalContextService: GlobalContextService,
    private readonly serversService: ServersService
  ) {
    super();

    // TODO: support multiple servers

    let prevAccount: AuthAccountInfo | null = null;
    let prevSelfHosted: boolean | undefined = undefined;
    const unsubscribe = this.currentAccount$.subscribe(
      ({ account, selfHosted }) => {
        const channel = resolveTelemetryChannel();

        setTelemetryContext({
          isAuthed: !!account,
          isSelfHosted: !!selfHosted,
          channel,
          officialEndpoint: getOfficialTelemetryEndpoint(channel),
        });

        if (prevAccount) {
          tracker.reset();
        }
        // the isSelfHosted property from environment is not reliable
        if (selfHosted !== prevSelfHosted) {
          tracker.register({
            isSelfHosted: selfHosted,
          });
        }
        prevSelfHosted = selfHosted;
        prevAccount = account ?? null;
        if (account) {
          tracker.identify(account.id);
          tracker.people.set({
            $email: account.email,
            $name: account.label,
            $avatar: account.avatar,
          });
          void flushTelemetry().catch(error => {
            logger.error('failed to flush telemetry after login', error);
          });
        } else if (prevAccount) {
          void flushTelemetry().catch(error => {
            logger.error('failed to flush telemetry after logout', error);
          });
        }
      }
    );
    this.disposableFns.push(() => {
      unsubscribe.unsubscribe();
    });
  }

  onApplicationStart() {
    this.registerMiddlewares();
  }

  registerMiddlewares() {
    this.disposables.push(
      tracker.middleware((_event, parameters) => {
        const extraContext = this.extractGlobalContext();
        return {
          ...extraContext,
          ...parameters,
        };
      })
    );
  }

  extractGlobalContext(): { page?: string; serverId?: string } {
    const globalContext = this.globalContextService.globalContext;
    const page = globalContext.isDoc.get()
      ? globalContext.isTrashDoc.get()
        ? 'trash'
        : globalContext.docMode.get() === 'page'
          ? 'doc'
          : 'edgeless'
      : globalContext.isAllDocs.get()
        ? 'allDocs'
        : globalContext.isTrash.get()
          ? 'trash'
          : globalContext.isCollection.get()
            ? 'collection'
            : globalContext.isTag.get()
              ? 'tag'
              : undefined;
    const serverId = globalContext.serverId.get() ?? undefined;
    return { page, serverId };
  }

  override dispose(): void {
    this.disposableFns.forEach(dispose => dispose());
    super.dispose();
  }
}
