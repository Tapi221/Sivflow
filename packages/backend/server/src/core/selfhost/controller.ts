import { Inject, Body, Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import {
  ActionForbidden,
  Config,
  InternalServerError,
  Mutex,
  PasswordRequired,
  UseNamedGuard,
} from '../../base';
import { Models } from '../../models';
import { Public, SessionIssuer } from '../auth';
import { ServerService } from '../config';
import { validators } from '../utils/validators';

interface CreateUserInput {
  name?: string;
  email: string;
}

@UseNamedGuard('selfhost')
@Controller('/api/setup')
export class CustomSetupController {
  constructor(
    @Inject(Config) private readonly config: Config,
    @Inject(Models) private readonly models: Models,
    @Inject(SessionIssuer) private readonly sessionIssuer: SessionIssuer,
    @Inject(Mutex) private readonly mutex: Mutex,
    @Inject(ServerService) private readonly server: ServerService
  ) {}

  @Public()
  @Post('/create-admin-user')
  async createAdmin(
    @Req() req: Request,
    @Res() res: Response,
    @Body() input: CreateUserInput
  ) {
    if (await this.server.initialized()) {
      throw new ActionForbidden('First user already created');
    }

    validators.assertValidEmail(input.email);

    await using lock = await this.mutex.acquire('createFirstAdmin');

    if (!lock) {
      throw new InternalServerError();
    }
    const user = await this.models.user.create({
      name: input.name || undefined,
      email: input.email,
    });

    try {
      await this.models.userFeature.add(
        user.id,
        'administrator',
        'selfhost setup'
      );

      await this.sessionIssuer.issue(req, res, {
        userId: user.id,
        method: 'oauth',
      });
      res.send({ id: user.id, email: user.email, name: user.name });
    } catch (e) {
      await this.models.user.delete(user.id);
      throw e;
    }
  }
}
