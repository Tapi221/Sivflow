import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

import { getBuildConfig } from './build-config';

type GlobalWithSentryRelease = typeof globalThis & {
  SENTRY_RELEASE?: unknown;
};

function hasExistingSentryRelease() {
  return Boolean((globalThis as GlobalWithSentryRelease).SENTRY_RELEASE);
}

function createSentry() {
  let client: Sentry.BrowserClient | undefined;
  const wrapped = {
    init() {
      if (hasExistingSentryRelease()) {
        return;
      }

      const buildConfig = getBuildConfig();
      const dsn = buildConfig.SENTRY_DSN.trim();
      if (!dsn) {
        return;
      }

      // https://docs.sentry.io/platforms/javascript/guides/react/#configure
      client = Sentry.init({
        dsn,
        debug: false,
        environment: buildConfig.appBuildType,
        integrations: [
          Sentry.reactRouterV6BrowserTracingIntegration({
            useEffect,
            useLocation,
            useNavigationType,
            createRoutesFromChildren,
            matchRoutes,
          }),
        ],
      }) as Sentry.BrowserClient;

      Sentry.setTags({
        distribution: buildConfig.distribution,
        appVersion: buildConfig.appVersion,
        editorVersion: buildConfig.editorVersion,
      });
    },
    enable() {
      if (client) {
        client.getOptions().enabled = true;
      }
    },
    disable() {
      if (client) {
        client.getOptions().enabled = false;
      }
    },
  };

  return wrapped;
}

export const sentry = createSentry();
