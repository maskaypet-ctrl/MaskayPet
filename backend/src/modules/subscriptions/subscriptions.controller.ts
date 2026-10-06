import {
  Body,
  Controller,
  Get,
  Ip,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscribeDto } from './dto/subscription.dto';
import { GenerateVouchersDto, RedeemVoucherDto } from './dto/voucher.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Suscripciones & Planes (SaaS)')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Consultar catálogo de planes y límites (Free vs Premium)' })
  async getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar suscripción actual del usuario' })
  async getMySubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getMySubscription(user.id);
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Contratar o cambiar de plan de suscripción' })
  async subscribe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubscribeDto,
    @Ip() ip: string,
  ) {
    return this.subscriptionsService.subscribe(user.id, dto, ip);
  }

  @Post('redeem')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Canjear un código de activación de un solo uso para activar/extender el plan Premium' })
  async redeemVoucher(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RedeemVoucherDto,
    @Ip() ip: string,
  ) {
    return this.subscriptionsService.redeemVoucher(user.id, dto, ip);
  }

  @Post('vouchers/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'support')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generar códigos de activación de un solo uso con duración personalizable (Admin / Support)' })
  async generateVouchers(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateVouchersDto,
    @Ip() ip: string,
  ) {
    return this.subscriptionsService.generateVouchers(user.id, dto, ip);
  }

  @Get('vouchers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'support')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar códigos de activación generados y su estado (Admin / Support)' })
  @ApiQuery({ name: 'status', required: false, enum: ['available', 'redeemed', 'expired', 'revoked'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listVouchers(
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    return this.subscriptionsService.listVouchers(status, limit ? Number(limit) : 50);
  }
}
