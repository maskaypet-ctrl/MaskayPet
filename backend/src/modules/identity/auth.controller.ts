import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import {
  AdminResetPasswordDto,
  ChangePasswordDto,
  ConfirmPasswordCodeDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  RequestPasswordCodeDto,
} from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Identity & Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar nueva cuenta de usuario y perfil' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
  async register(@Body() dto: RegisterDto, @Ip() ip: string, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    return this.authService.register(dto, ip, userAgent);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión con credenciales' })
  @ApiResponse({ status: 200, description: 'Autenticación exitosa y emisión de tokens' })
  async login(@Body() dto: LoginDto, @Ip() ip: string, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    return this.authService.login(dto, ip, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refrescar Access Token usando Refresh Token' })
  async refresh(@Body() dto: RefreshTokenDto, @Ip() ip: string, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    return this.authService.refreshSession(dto, ip, userAgent);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión activa' })
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener datos del usuario autenticado' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar la contraseña actual del usuario autenticado' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Ip() ip: string,
  ) {
    return this.authService.changePassword(user.id, dto, ip);
  }

  @Post('admin/reset-password/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'support')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restablecer contraseña de un usuario (Solo Admin / Soporte)' })
  async adminResetPassword(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('userId') targetUserId: string,
    @Body() dto: AdminResetPasswordDto,
    @Ip() ip: string,
  ) {
    return this.authService.adminResetPassword(admin.id, targetUserId, dto, ip);
  }

  @Public()
  @Post('request-password-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar código de verificación de 6 dígitos al correo para recuperar/cambiar contraseña' })
  async requestPasswordCode(@Body() dto: RequestPasswordCodeDto) {
    return this.authService.requestPasswordCode(dto);
  }

  @Public()
  @Post('confirm-password-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar código de verificación de 6 dígitos y actualizar contraseña' })
  async confirmPasswordCode(@Body() dto: ConfirmPasswordCodeDto, @Ip() ip: string) {
    return this.authService.confirmPasswordCode(dto, ip);
  }
}
