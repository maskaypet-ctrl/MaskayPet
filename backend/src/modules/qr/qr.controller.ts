import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AssignQrDto, CreateBatchDto, UnassignQrDto } from './dto/qr.dto';
import { QrService } from './qr.service';

@ApiTags('Placas QR & Escaneo')
@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Public()
  @Get('public/:publicCode')
  @ApiOperation({ summary: 'Punto de entrada público al escanear una chapa QR (sin autenticación)' })
  async resolvePublicScan(@Param('publicCode') publicCode: string, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    return this.qrService.resolvePublicScan(publicCode, userAgent);
  }

  @Post('assign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vincular una placa QR a una mascota del usuario' })
  async assignTag(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AssignQrDto,
    @Ip() ip: string,
  ) {
    return this.qrService.assignTag(user.id, dto, ip);
  }

  @Post('unassign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desvincular una placa QR de una mascota' })
  async unassignTag(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UnassignQrDto,
    @Ip() ip: string,
  ) {
    return this.qrService.unassignTag(user.id, dto, ip);
  }

  @Post('batches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'production_manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear lote de producción de tags QR (Admin / Production Manager)' })
  async createBatch(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBatchDto,
    @Ip() ip: string,
  ) {
    return this.qrService.createProductionBatch(user.id, dto, ip);
  }
}
