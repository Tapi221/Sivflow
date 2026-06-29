import type {
  CanActivate,
  ExecutionContext,
  OnModuleInit,
} from '@nestjs/common';
import { Inject, Injectable } from '@nestjs/common';

import {
  Config,
  getClientVersionFromRequest,
  getRequestResponseFromContext,
  GuardProvider,
} from '../../base';
import { VersionService } from './service';

@Injectable()
export class VersionGuardProvider
  extends GuardProvider
  implements CanActivate, OnModuleInit
{
  name = 'version' as const;

  constructor(
    @Inject(Config) private readonly config: Config,
    @Inject(VersionService) private readonly version: VersionService
  ) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    if (!this.config.client.versionControl.enabled) {
      return true;
    }

    const { req } = getRequestResponseFromContext(context);

    const version = getClientVersionFromRequest(req);

    return this.version.checkVersion(version);
  }
}
