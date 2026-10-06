import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class GenerateVouchersDto {
  @ApiProperty({
    example: 'premium',
    enum: ['free', 'premium'],
    default: 'premium',
    description: 'Nivel del plan a activar',
  })
  @IsString()
  @IsIn(['free', 'premium'])
  tier: string = 'premium';

  @ApiProperty({
    example: 30,
    required: false,
    description: 'Duración en días (ej: 30 para 1 mes, 180 para 6 meses, 365 para 1 año)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @ApiProperty({
    example: 1,
    required: false,
    description: 'Alternativa: Duración en meses (1, 3, 6, 12). Si se envía, se convierte a días automáticamente.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  months?: number;

  @ApiProperty({
    example: 1,
    default: 1,
    required: false,
    description: 'Cantidad de códigos únicos a generar en lote (máximo 100 por solicitud)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number = 1;

  @ApiProperty({
    example: 'ACT',
    required: false,
    description: 'Prefijo personalizado para los códigos (ej: ACT, VIP, VET-LIMA)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  codePrefix?: string;

  @ApiProperty({
    example: '2026-12-31T23:59:59Z',
    required: false,
    description: 'Fecha límite opcional en la que expira la validez del código para ser canjeado',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({
    example: 'Venta directa por Yape - Pedido #1024',
    required: false,
    description: 'Notas administrativas o motivo de emisión',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}

export class RedeemVoucherDto {
  @ApiProperty({
    example: 'ACT-PREM-1M-7B2K9X',
    description: 'Código de activación de un solo uso ingresado por el usuario',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}
