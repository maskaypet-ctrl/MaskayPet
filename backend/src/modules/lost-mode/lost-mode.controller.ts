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
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  ActivateLostModeDto,
  LocationPingDto,
  ResolveLostModeDto,
} from './dto/lost-mode.dto';
import { LostModeService } from './lost-mode.service';

@ApiTags('Modo Perdido & GPS')
@Controller('lost-mode')
export class LostModeController {
  constructor(private readonly lostModeService: LostModeService) {}

  @Post('activate/:petId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activar el Modo Perdido para una mascota' })
  async activateLostMode(
    @Param('petId') petId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ActivateLostModeDto,
    @Ip() ip: string,
  ) {
    return this.lostModeService.activateLostMode(petId, user.id, dto, ip);
  }

  @Post('resolve/:petId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolver y marcar a la mascota como recuperada' })
  async resolveLostMode(
    @Param('petId') petId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ResolveLostModeDto,
    @Ip() ip: string,
  ) {
    return this.lostModeService.resolveLostMode(petId, user.id, dto, ip);
  }

  @Public()
  @Post('ping')
  @ApiOperation({ summary: 'Enviar coordenadas GPS desde la vista de escaneo de QR (público)' })
  async recordLocationPing(@Body() dto: LocationPingDto) {
    return this.lostModeService.recordLocationPing(dto);
  }

  @Get('history/:petId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar historial de pings de ubicación y escaneos de la mascota' })
  async getPetLocationHistory(
    @Param('petId') petId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.lostModeService.getPetLocationHistory(petId, user.id);
  }
}
