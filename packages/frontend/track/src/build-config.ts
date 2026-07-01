type BuildChannel = 'stable' | 'beta' | 'internal' | 'local';

type TrackBuildConfig = Pick<
  BUILD_CONFIG_TYPE,
  | 'SENTRY_DSN'
  | 'appVersion'
  | 'distribution'
  | 'editorVersion'
  | 'isElectron'
  | 'isMobileEdition'
> & {
  appBuildType: string;
  channel: BuildChannel;
};

const fallbackBuildConfig: TrackBuildConfig = {
  SENTRY_DSN: '',
  appBuildType: 'stable',
  appVersion: '',
  channel: 'stable',
  distribution: 'web',
  editorVersion: '',
  isElectron: false,
  isMobileEdition: false,
};

const buildChannels = new Set<BuildChannel>([
  'stable',
  'beta',
  'internal',
  'local',
]);

const distributions = new Set<BUILD_CONFIG_TYPE['distribution']>([
  'web',
  'desktop',
  'admin',
  'mobile',
  'ios',
  'android',
]);

function readGlobalBuildConfig(): Partial<BUILD_CONFIG_TYPE> | undefined {
  try {
    if (typeof BUILD_CONFIG !== 'undefined') {
      return BUILD_CONFIG;
    }
  } catch {
    // BUILD_CONFIG が未注入の環境では globalThis 側の確認に進む
  }

  return (globalThis as { BUILD_CONFIG?: Partial<BUILD_CONFIG_TYPE> })
    .BUILD_CONFIG;
}

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function readBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function readBuildChannel(value: unknown): BuildChannel {
  return buildChannels.has(value as BuildChannel)
    ? (value as BuildChannel)
    : fallbackBuildConfig.channel;
}

function readDistribution(value: unknown) {
  return distributions.has(value as BUILD_CONFIG_TYPE['distribution'])
    ? (value as BUILD_CONFIG_TYPE['distribution'])
    : fallbackBuildConfig.distribution;
}

export function getBuildConfig(): TrackBuildConfig {
  const buildConfig = readGlobalBuildConfig();

  return {
    SENTRY_DSN: readString(buildConfig?.SENTRY_DSN),
    appBuildType: readString(
      buildConfig?.appBuildType,
      fallbackBuildConfig.appBuildType
    ),
    appVersion: readString(buildConfig?.appVersion),
    channel: readBuildChannel(buildConfig?.appBuildType),
    distribution: readDistribution(buildConfig?.distribution),
    editorVersion: readString(buildConfig?.editorVersion),
    isElectron: readBoolean(buildConfig?.isElectron),
    isMobileEdition: readBoolean(buildConfig?.isMobileEdition),
  };
}

export function getBuildChannel() {
  return getBuildConfig().channel;
}
