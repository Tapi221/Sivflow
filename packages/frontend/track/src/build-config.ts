type TrackBuildConfig = Pick<
  BUILD_CONFIG_TYPE,
  | 'SENTRY_DSN'
  | 'appBuildType'
  | 'appVersion'
  | 'distribution'
  | 'editorVersion'
  | 'isElectron'
  | 'isMobileEdition'
>;

const fallbackBuildConfig: TrackBuildConfig = {
  SENTRY_DSN: '',
  appBuildType: 'stable',
  appVersion: '',
  distribution: 'web',
  editorVersion: '',
  isElectron: false,
  isMobileEdition: false,
};

const buildChannels = new Set<BUILD_CONFIG_TYPE['appBuildType']>([
  'stable',
  'beta',
  'internal',
  'canary',
]);

const distributions = new Set<BUILD_CONFIG_TYPE['distribution']>([
  'web',
  'desktop',
  'admin',
  'mobile',
  'ios',
  'android',
]);

function readGlobalBuildConfig() {
  return (globalThis as { BUILD_CONFIG?: Partial<BUILD_CONFIG_TYPE> })
    .BUILD_CONFIG;
}

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function readBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function readBuildChannel(value: unknown) {
  return buildChannels.has(value as BUILD_CONFIG_TYPE['appBuildType'])
    ? (value as BUILD_CONFIG_TYPE['appBuildType'])
    : fallbackBuildConfig.appBuildType;
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
    appBuildType: readBuildChannel(buildConfig?.appBuildType),
    appVersion: readString(buildConfig?.appVersion),
    distribution: readDistribution(buildConfig?.distribution),
    editorVersion: readString(buildConfig?.editorVersion),
    isElectron: readBoolean(buildConfig?.isElectron),
    isMobileEdition: readBoolean(buildConfig?.isMobileEdition),
  };
}

export function getBuildChannel() {
  return getBuildConfig().appBuildType;
}
