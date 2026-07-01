import { getBuildConfig } from '@affine-tools/utils/build-config';
import { Package } from '@affine-tools/utils/workspace';
import { createApp } from './create-app';

globalThis.BUILD_CONFIG = getBuildConfig(new Package('@affine/web'), {
  mode: 'development',
  channel: 'local',
});
// @ts-expect-error testing
globalThis.app = await createApp();