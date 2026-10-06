import { Body, Controller, Get, Ip, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CommerceService } from './commerce.service';
import { CreateOrderDto } from './dto/commerce.dto';

@ApiTags('Tienda & Placas Físicas')
@Controller('commerce')
export class CommerceController {
  constructor(private readonly commerceService: CommerceService) {}

  @Public()
  @Get('products')
  @ApiOperation({ summary: 'Obtener catálogo de productos y placas QR' })
  async getProducts() {
    return this.commerceService.getProducts();
  }

  @Post('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear un pedido de compra de chapas QR o collares' })
  async createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
    @Ip() ip: string,
  ) {
    return this.commerceService.createOrder(user.id, dto, ip);
  }

  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar historial de pedidos del usuario' })
  async getMyOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.commerceService.getMyOrders(user.id);
  }
}
