import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VeterinaryService } from './veterinary.service';

@ApiTags('Directorio Veterinario')
@Controller('veterinary')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VeterinaryController {
  constructor(private readonly veterinaryService: VeterinaryService) {}

  @Get('clinics')
  @ApiOperation({ summary: 'Consultar clínicas veterinarias aliadas y registradas' })
  async getClinics() {
    return this.veterinaryService.getClinics();
  }

  @Get('veterinarians')
  @ApiOperation({ summary: 'Consultar veterinarios registrados' })
  async getVeterinarians(@Query('clinicId') clinicId?: string) {
    return this.veterinaryService.getVeterinarians(clinicId);
  }
}
