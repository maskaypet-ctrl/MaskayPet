import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RegisterDeviceTokenDto, UpdateNotificationPreferencesDto } from './dto/notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notificaciones & Recordatorios')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener notificaciones del usuario' })
  async getMyNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getMyNotifications(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  async markAsRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Consultar preferencias de notificación (Push, Email, SMS)' })
  async getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getPreferences(user.id);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Actualizar canales y preferencias de alerta' })
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(user.id, dto);
  }

  @Post('devices')
  @ApiOperation({ summary: 'Registrar token de dispositivo móvil o web (FCM / Expo Push)' })
  async registerDeviceToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    return this.notificationsService.registerDeviceToken(user.id, dto);
  }

  @Get('reminders')
  @ApiOperation({ summary: 'Obtener recordatorios próximos de vacunas, desparasitaciones y citas' })
  async getUpcomingReminders(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getUpcomingReminders(user.id);
  }
}
