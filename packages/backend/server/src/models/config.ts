import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { BaseModel } from './base';

const LEGACY_SERVER_NAMES = new Map<string, string>([
  ['AFFiNE Canary Cloud', 'Sivflow Cloud'],
  ['AFFiNE Cloud', 'Sivflow Cloud'],
]);

function normalizeConfigValue(key: string, value: unknown) {
  if (key !== 'server.name' || typeof value !== 'string') {
    return value;
  }

  return LEGACY_SERVER_NAMES.get(value.trim()) ?? value;
}

function normalizeConfigUpdate(update: { key: string; value: any }) {
  return {
    ...update,
    value: normalizeConfigValue(update.key, update.value),
  };
}

@Injectable()
export class AppConfigModel extends BaseModel {
  async load() {
    const configs = await this.db.appConfig.findMany();
    const normalizedConfigs = configs.map(config => ({
      ...config,
      value: normalizeConfigValue(config.id, config.value),
    }));

    await Promise.all(
      normalizedConfigs
        .filter(config => config.value !== configs.find(({ id }) => id === config.id)?.value)
        .map(config =>
          this.db.appConfig.update({
            where: { id: config.id },
            data: { value: config.value },
          })
        )
    );

    return normalizedConfigs;
  }

  @Transactional()
  async save(actorId: string | null, updates: Array<{ key: string; value: any }>) {
    const normalizedUpdates = updates.map(normalizeConfigUpdate);

    return await Promise.allSettled(
      normalizedUpdates.map(async update => {
        return this.db.appConfig.upsert({
          where: { id: update.key },
          update: { value: update.value, lastUpdatedBy: actorId },
          create: { id: update.key, value: update.value, lastUpdatedBy: actorId },
        });
      })
    );
  }
}
