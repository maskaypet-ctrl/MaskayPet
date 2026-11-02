import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SubscribeDto {
  @ApiProperty({ example: 'premium', enum: ['free', 'premium'] })
  @IsString()
  @IsIn(['free', 'premium'])
  tier: string;

  @ApiProperty({
    example: 'monthly_1m',
    enum: ['trial_14d', 'monthly_1m', 'quarterly_3m', 'semiannual_6m', 'annual_1y', 'free'],
    required: false,
  })
  @IsOptional()
  @IsString()
  billingCycle?: string;

  @ApiProperty({ example: 30, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationDays?: number;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isTrial?: boolean;

  @ApiProperty({ example: 'yape', enum: ['yape', 'plin', 'culqi', 'mercadopago', 'stripe', 'free_trial', 'manual'], required: false })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({ example: 'pay_token_123456', required: false })
  @IsOptional()
  @IsString()
  providerPaymentToken?: string;
}

export class AdminGrantSubscriptionDto {
  @ApiProperty({
    example: 'monthly_1m',
    enum: ['free', 'trial_7d', 'trial_14d', 'monthly_1m', 'quarterly_3m', 'semiannual_6m', 'annual_1y', 'custom'],
  })
  @IsString()
  @IsNotEmpty()
  planType: string;

  @ApiProperty({ example: 30, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  customDays?: number;

  @ApiProperty({ example: 'Activado por soporte tras pago Yape', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
