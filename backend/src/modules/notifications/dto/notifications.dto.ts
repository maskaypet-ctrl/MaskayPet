import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  push_enabled?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  email_enabled?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  sms_enabled?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  lostPetAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  lost_pet_alerts?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  vaccineReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  vaccine_reminders?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  treatmentReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  treatment_reminders?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  appointmentReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  appointment_reminders?: boolean;
}

export class RegisterDeviceTokenDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'ios', enum: ['ios', 'android', 'web'] })
  @IsString()
  @IsIn(['ios', 'android', 'web'])
  platform: string;
}
