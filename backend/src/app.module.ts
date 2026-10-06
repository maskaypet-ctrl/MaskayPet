import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { IdentityModule } from './modules/identity/identity.module';
import { UsersModule } from './modules/users/users.module';
import { PetsModule } from './modules/pets/pets.module';
import { QrModule } from './modules/qr/qr.module';
import { LostModeModule } from './modules/lost-mode/lost-mode.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { CommerceModule } from './modules/commerce/commerce.module';
import { VeterinaryModule } from './modules/veterinary/veterinary.module';
import { AuditModule } from './modules/audit/audit.module';
import { KeepAliveService } from './common/services/keep-alive.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    DatabaseModule,
    IdentityModule,
    UsersModule,
    PetsModule,
    QrModule,
    LostModeModule,
    HealthModule,
    NotificationsModule,
    SubscriptionsModule,
    CommerceModule,
    VeterinaryModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [KeepAliveService],
})
export class AppModule {}
