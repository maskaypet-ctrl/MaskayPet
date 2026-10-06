import { ApiProperty } from '@nestjs/swagger';
import {
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ActivateLostModeDto {
  @ApiProperty({ example: 'Se extravió cerca del Parque Kennedy en Miraflores. Llevaba collar rojo.', required: false })
  @IsOptional()
  @IsString()
  emergencyMessage?: string;
}

export class ResolveLostModeDto {
  @ApiProperty({ example: 'via_scan', enum: ['via_scan', 'otro_medio'], description: 'Método por el cual se recuperó la mascota' })
  @IsString()
  @IsNotEmpty()
  recoveryMethod: string;

  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', required: false, description: 'ID del ping de ubicación decisivo' })
  @IsOptional()
  @IsString()
  resolutionPingId?: string;

  @ApiProperty({ example: 'Una vecina escaneó la chapa y nos llamó en menos de 10 minutos. ¡Excelente plataforma!', required: false })
  @IsOptional()
  @IsString()
  ownerTestimonial?: string;
}

export class LocationPingDto {
  @ApiProperty({ example: -12.1217, description: 'Latitud GPS (-90 a 90)' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: -77.0298, description: 'Longitud GPS (-180 a 180)' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ example: 15.5, required: false, description: 'Precisión en metros reportada por el navegador' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracyM?: number;

  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', required: false, description: 'ID del evento de modo perdido si aplica' })
  @IsOptional()
  @IsString()
  lostModeEventId?: string;

  @ApiProperty({ example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', required: false, description: 'ID del tag QR escaneado' })
  @IsOptional()
  @IsString()
  qrTagId?: string;
}
