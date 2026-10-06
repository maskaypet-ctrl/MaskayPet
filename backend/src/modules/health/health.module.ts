import { Module } from '@nestjs/common';
import { PetsModule } from '../pets/pets.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [PetsModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
