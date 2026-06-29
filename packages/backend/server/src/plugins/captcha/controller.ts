import { Inject, Controller, Get } from '@nestjs/common';

import { Throttle } from '../../base';
import { Public } from '../../core/auth';
import { CaptchaService } from './service';

@Throttle('strict')
@Controller('/api/auth')
export class CaptchaController {
  constructor(@Inject(CaptchaService) private readonly captcha: CaptchaService) {}

  @Public()
  @Get('/challenge')
  async getChallenge() {
    return this.captcha.getChallengeToken();
  }
}
