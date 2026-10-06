import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class AssignQrDto {
  @ApiProperty({ example: 'PET-QR-DEMO01', description: 'Código público impreso en la placa QR' })
  @IsString()
  @IsNotEmpty({ message: 'El código QR es obligatorio' })
  publicCode: string;

  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'ID de la mascota a vincular' })
  @IsString()
  @IsNotEmpty({ message: 'El ID de la mascota es obligatorio' })
  petId: string;
}

export class UnassignQrDto {
  @ApiProperty({ example: 'PET-QR-DEMO01', description: 'Código público de la placa' })
  @IsString()
  @IsNotEmpty()
  publicCode: string;

  @ApiProperty({ example: 'Cambio de placa / Pérdida de placa física', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateBatchDto {
  @ApiProperty({ example: 'BATCH-2026-LIMA-02', description: 'Código identificador del lote' })
  @IsString()
  @IsNotEmpty()
  batchCode: string;

  @ApiProperty({ example: 100, description: 'Cantidad de códigos QR a generar en este lote' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 'Lote de placas metálicas grabadas con láser', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
