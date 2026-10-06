import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CreateAppointmentDto,
  CreateDewormingDto,
  CreateDiagnosisDto,
  CreateMedicalDocumentDto,
  CreateTreatmentDto,
  CreateVaccinationDto,
  CreateWeightRecordDto,
} from './dto/health.dto';
import { HealthService } from './health.service';

@ApiTags('Salud & Historial Clínico')
@Controller('health')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  // Vacunas
  @Get('pets/:petId/vaccinations')
  @ApiOperation({ summary: 'Listar vacunas registradas de una mascota' })
  async getVaccinations(@Param('petId') petId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.healthService.getVaccinations(petId, user.id);
  }

  @Post('pets/:petId/vaccinations')
  @ApiOperation({ summary: 'Registrar nueva vacuna' })
  async addVaccination(
    @Param('petId') petId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateVaccinationDto,
    @Ip() ip: string,
  ) {
    return this.healthService.addVaccination(petId, user.id, dto, ip);
  }

  // Desparasitaciones
  @Get('pets/:petId/deworming')
  @ApiOperation({ summary: 'Listar desparasitaciones de una mascota' })
  async getDeworming(@Param('petId') petId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.healthService.getDeworming(petId, user.id);
  }

  @Post('pets/:petId/deworming')
  @ApiOperation({ summary: 'Registrar desparasitación' })
  async addDeworming(
    @Param('petId') petId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDewormingDto,
    @Ip() ip: string,
  ) {
    return this.healthService.addDeworming(petId, user.id, dto, ip);
  }

  // Tratamientos
  @Get('pets/:petId/treatments')
  @ApiOperation({ summary: 'Listar tratamientos médicos' })
  async getTreatments(@Param('petId') petId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.healthService.getTreatments(petId, user.id);
  }

  @Post('pets/:petId/treatments')
  @ApiOperation({ summary: 'Registrar tratamiento médico' })
  async addTreatment(
    @Param('petId') petId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTreatmentDto,
    @Ip() ip: string,
  ) {
    return this.healthService.addTreatment(petId, user.id, dto, ip);
  }

  // Diagnósticos
  @Get('pets/:petId/diagnoses')
  @ApiOperation({ summary: 'Listar diagnósticos clínicos' })
  async getDiagnoses(@Param('petId') petId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.healthService.getDiagnoses(petId, user.id);
  }

  @Post('pets/:petId/diagnoses')
  @ApiOperation({ summary: 'Registrar diagnóstico clínico' })
  async addDiagnosis(
    @Param('petId') petId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDiagnosisDto,
    @Ip() ip: string,
  ) {
    return this.healthService.addDiagnosis(petId, user.id, dto, ip);
  }

  // Peso
  @Get('pets/:petId/weight')
  @ApiOperation({ summary: 'Consultar curva histórica de peso' })
  async getWeightRecords(@Param('petId') petId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.healthService.getWeightRecords(petId, user.id);
  }

  @Post('pets/:petId/weight')
  @ApiOperation({ summary: 'Registrar pesaje' })
  async addWeightRecord(
    @Param('petId') petId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWeightRecordDto,
    @Ip() ip: string,
  ) {
    return this.healthService.addWeightRecord(petId, user.id, dto, ip);
  }

  // Citas
  @Get('pets/:petId/appointments')
  @ApiOperation({ summary: 'Listar citas veterinarias' })
  async getAppointments(@Param('petId') petId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.healthService.getAppointments(petId, user.id);
  }

  @Post('pets/:petId/appointments')
  @ApiOperation({ summary: 'Agendar cita veterinaria' })
  async addAppointment(
    @Param('petId') petId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAppointmentDto,
    @Ip() ip: string,
  ) {
    return this.healthService.addAppointment(petId, user.id, dto, ip);
  }

  // Documentos
  @Get('pets/:petId/documents')
  @ApiOperation({ summary: 'Listar documentos clínicos subidos' })
  async getDocuments(@Param('petId') petId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.healthService.getDocuments(petId, user.id);
  }

  @Post('pets/:petId/documents')
  @ApiOperation({ summary: 'Registrar metadata de documento médico adjunto' })
  async addDocument(
    @Param('petId') petId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMedicalDocumentDto,
    @Ip() ip: string,
  ) {
    return this.healthService.addDocument(petId, user.id, dto, ip);
  }
}
