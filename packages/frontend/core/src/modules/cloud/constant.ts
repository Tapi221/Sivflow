import {
  OAuthProviderType,
  ServerDeploymentType,
  ServerFeature,
} from '@affine/graphql';

import type { ServerConfig, ServerMetadata } from './types';

const localServerBaseUrl = BUILD_CONFIG.isElectron
  ? 'http://localhost:8080'
  : location.origin;

const localServerConfig: ServerConfig = BUILD_CONFIG.backendEnabled
  ? {
      serverName: 'Sivflow Cloud',
      features: [
        ServerFeature.Indexer,
        ServerFeature.Copilot,
        ServerFeature.CopilotEmbedding,
        ServerFeature.OAuth,
        ServerFeature.Payment,
        ServerFeature.LocalWorkspace,
      ],
      oauthProviders: [OAuthProviderType.Google, OAuthProviderType.Apple],
      type: ServerDeploymentType.Affine,
      credentialsRequirement: {
        password: {
          minLength: 8,
          maxLength: 32,
        },
      },
    }
  : {
      serverName: 'Sivflow Local',
      features: [ServerFeature.LocalWorkspace],
      oauthProviders: [],
      type: ServerDeploymentType.Selfhosted,
      credentialsRequirement: {
        password: {
          minLength: 8,
          maxLength: 32,
        },
      },
    };

const cloudServerConfig: ServerConfig = {
  serverName: 'Sivflow Cloud',
  features: [
    ServerFeature.Indexer,
    ServerFeature.Copilot,
    ServerFeature.CopilotEmbedding,
    ServerFeature.OAuth,
    ServerFeature.Payment,
    ServerFeature.LocalWorkspace,
  ],
  oauthProviders: [OAuthProviderType.Google, OAuthProviderType.Apple],
  type: ServerDeploymentType.Affine,
  credentialsRequirement: {
    password: {
      minLength: 8,
      maxLength: 32,
    },
  },
};

const stableCloudBaseUrl = BUILD_CONFIG.isNative
  ? BUILD_CONFIG.isIOS
    ? 'https://apple.getaffineapp.com'
    : 'https://app.affine.pro'
  : location.origin;

const betaCloudBaseUrl = BUILD_CONFIG.isNative
  ? BUILD_CONFIG.isIOS
    ? 'https://apple.getaffineapp.com'
    : 'https://insider.affine.pro'
  : location.origin;

export const BUILD_IN_SERVERS: (ServerMetadata & { config: ServerConfig })[] =
  environment.isSelfHosted
    ? [
        {
          id: 'affine-cloud',
          baseUrl: location.origin,
          // selfhosted baseUrl is `location.origin`
          // this is ok for web app, but not for desktop app
          // since we never build desktop app in selfhosted mode, so it's fine
          config: {
            serverName: 'Sivflow Selfhost',
            features: [],
            oauthProviders: [],
            type: ServerDeploymentType.Selfhosted,
            credentialsRequirement: {
              password: {
                minLength: 8,
                maxLength: 32,
              },
            },
          },
        },
      ]
    : BUILD_CONFIG.debug
      ? [
          {
            id: 'affine-cloud',
            baseUrl: localServerBaseUrl,
            config: localServerConfig,
          },
        ]
      : BUILD_CONFIG.appBuildType === 'stable'
        ? [
            {
              id: 'affine-cloud',
              baseUrl: stableCloudBaseUrl,
              config: cloudServerConfig,
            },
          ]
        : BUILD_CONFIG.appBuildType === 'beta'
          ? [
              {
                id: 'affine-cloud',
                baseUrl: betaCloudBaseUrl,
                config: cloudServerConfig,
              },
            ]
          : BUILD_CONFIG.appBuildType === 'internal'
            ? [
                {
                  id: 'affine-cloud',
                  baseUrl: 'https://insider.affine.pro',
                  config: cloudServerConfig,
                },
              ]
            : [];

export type TelemetryChannel = 'stable' | 'beta' | 'internal' | 'local';

const OFFICIAL_TELEMETRY_ENDPOINTS: Record<TelemetryChannel, string> = {
  stable: 'https://app.affine.pro',
  beta: 'https://insider.affine.pro',
  internal: 'https://insider.affine.pro',
  local: 'http://localhost:8080',
};

const OFFICIAL_TELEMETRY_CHANNELS = [
  'stable',
  'beta',
  'internal',
] as const;

type OfficialTelemetryChannel = (typeof OFFICIAL_TELEMETRY_CHANNELS)[number];

type GlobalWithBuildConfig = typeof globalThis & {
  BUILD_CONFIG?: Partial<BUILD_CONFIG_TYPE>;
};

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

function isOfficialTelemetryChannel(
  channel: unknown
): channel is OfficialTelemetryChannel {
  return (
    typeof channel === 'string' &&
    (OFFICIAL_TELEMETRY_CHANNELS as readonly string[]).includes(channel)
  );
}

function getLocationOrigin() {
  try {
    return typeof location === 'undefined'
      ? OFFICIAL_TELEMETRY_ENDPOINTS.local
      : location.origin;
  } catch {
    return OFFICIAL_TELEMETRY_ENDPOINTS.local;
  }
}

export function getOfficialTelemetryEndpoint(
  channel = readGlobalBuildConfig()?.appBuildType
): string {
  const buildConfig = readGlobalBuildConfig();

  if (buildConfig?.debug) {
    return buildConfig.isNative
      ? OFFICIAL_TELEMETRY_ENDPOINTS.local
      : getLocationOrigin();
  }

  if (isOfficialTelemetryChannel(channel)) {
    return OFFICIAL_TELEMETRY_ENDPOINTS[channel];
  }

  return OFFICIAL_TELEMETRY_ENDPOINTS.stable;
}
