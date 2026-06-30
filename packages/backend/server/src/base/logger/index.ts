import { Global, Module } from '@nestjs/common';

import { AFFiNELogger } from './service';

@Global()
@Module({
  providers: [AFFiNELogger],
  exports: [AFFiNELogger],
})
export class LoggerModule {}

export { AFFiNELogger } from './service';
