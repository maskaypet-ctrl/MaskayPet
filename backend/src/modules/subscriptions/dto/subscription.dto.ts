import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SubscribeDto {
  @ApiProperty({ example: 'premium', enum: ['free', 'premium'] })
  @IsString()
  @IsIn(['free', 'premium'])
  tier: string;

  @ApiProperty({ example: 'culqi', enum: ['culqi', 'mercadopago', 'stripe', 'manual'], required: false })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({ example: 'pay_token_123456', required: false })
  @IsOptional()
  @IsString()
  providerPaymentToken?: string;
}
