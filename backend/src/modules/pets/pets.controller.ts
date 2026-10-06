import {
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CreatePetContactDto,
  CreatePetDto,
  UpdatePetDto,
  UpdatePublicProfileDto,
} from './dto/pet.dto';
import { PetsService } from './pets.service';

@ApiTags('Mascotas & Perfiles')
@Controller('pets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar mascotas del usuario actual (propias y compartidas)' })
  async getMyPets(@CurrentUser() user: AuthenticatedUser) {
    return this.petsService.getMyPets(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar una nueva mascota' })
  async createPet(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePetDto,
    @Ip() ip: string,
  ) {
    return this.petsService.createPet(user.id, dto, ip);
  }

  @Get('dashboard/summary')
  @ApiOperation({ summary: 'Obtener métricas y resumen operativo en tiempo real para el Dashboard' })
  async getDashboardSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.petsService.getDashboardSummary(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle completo de una mascota' })
  async getPetById(@Param('id') petId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.petsService.getPetById(petId, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos de una mascota' })
  async updatePet(
    @Param('id') petId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePetDto,
    @Ip() ip: string,
  ) {
    return this.petsService.updatePet(petId, user.id, dto, ip);
  }

  @Post(':id/contacts')
  @ApiOperation({ summary: 'Agregar un contacto de emergencia a la mascota' })
  async addContact(
    @Param('id') petId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePetContactDto,
    @Ip() ip: string,
  ) {
    return this.petsService.addContact(petId, user.id, dto, ip);
  }

  @Delete(':id/contacts/:contactId')
  @ApiOperation({ summary: 'Eliminar un contacto de emergencia' })
  async deleteContact(
    @Param('id') petId: string,
    @Param('contactId') contactId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.petsService.deleteContact(petId, contactId, user.id, ip);
  }

  @Patch(':id/public-profile')
  @ApiOperation({ summary: 'Actualizar preferencias de visibilidad del perfil público QR' })
  async updatePublicProfile(
    @Param('id') petId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePublicProfileDto,
    @Ip() ip: string,
  ) {
    return this.petsService.updatePublicProfile(petId, user.id, dto, ip);
  }
}
