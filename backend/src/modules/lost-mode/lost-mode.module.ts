import { Module } from '@nestjs/common';
import { LostModeController } from './lost-mode.controller';
import { LostModeService } from './lost-mode.service';

@Module({
  controllers: [LostModeController],
  providers: [LostModeService],
  exports: [LostModeService],
})
export class LostModeModule {}
