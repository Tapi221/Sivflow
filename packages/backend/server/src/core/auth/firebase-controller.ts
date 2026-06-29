import {
  Inject,
  Body,
  Controller,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { InvalidAuthState, UseNamedGuard } from '../../base';
import { Models } from '../../models';
import { Public } from './guard';
import { FirebaseAuthService } from './firebase';
import { SessionIssuer } from './session-issuer';

interface FirebaseCredential {
  token: string;
}

@Controller('/api/auth/firebase')
export class FirebaseAuthController {
  constructor(
    @Inject(Models) private readonly models: Models,
    @Inject(SessionIssuer) private readonly sessionIssuer: SessionIssuer
  ) {}

  @Public()
  @UseNamedGuard('version')
  @Post()
  async signIn(
    @Req() req: Request,
    @Res() res: Response,
    @Body() credential: FirebaseCredential
  ) {
    if (!credential?.token) throw new InvalidAuthState();
    const identity = await new FirebaseAuthService(this.models).verifyIdToken(
      credential.token
    );
    const { exchangeCode } = await this.sessionIssuer.issue(req, res, identity);
    res.send({ id: identity.userId, exchangeCode });
  }
}
