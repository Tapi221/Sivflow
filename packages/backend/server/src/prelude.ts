import 'reflect-metadata';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { config } from 'dotenv';

import { createGlobalEnv } from './env';

function loadPrivateKey() {
  const file = join(CUSTOM_CONFIG_PATH, 'private.key');
  if (!process.env.AFFINE_PRIVATE_KEY && existsSync(file)) {
    const privateKey = readFileSync(file, 'utf-8');
    process.env.AFFINE_PRIVATE_KEY = privateKey;
  }
}

function load() {
  const isPrivateKeyFromEnv = !!process.env.AFFINE_PRIVATE_KEY;
  // load `.env` under pwd
  config();
  // load `.env` under user config folder
  config({
    path: join(CUSTOM_CONFIG_PATH, '.env'),
  });

  // The old AFFINE_PRIVATE_KEY in old .env is somehow not working,
  // we should ignore it
  if (!isPrivateKeyFromEnv) {
    if (process.env.AFFINE_PRIVATE_KEY) {
      console.warn(
        'AFFINE_PRIVATE_KEY loaded from .env is ignored. Use config/private.key or an explicit process environment variable instead.'
      );
    }
    delete process.env.AFFINE_PRIVATE_KEY;
  }

  // 2. load `config/private.key` to patch app configs
  loadPrivateKey();
}

load();
createGlobalEnv();

export const env = globalThis.env;
export const CLS_REQUEST_HOST = globalThis.CLS_REQUEST_HOST;
