import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateVaccinationDto {
  @ApiProperty({ example: 'Séxtuple Canina / Antirrábica' })
  @IsString()
  @IsNotEmpty()
  vaccineName: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  applicationDate: string;

  @ApiProperty({ example: '2027-03-01', required: false })
  @IsOptional()
  @IsDateString()
  nextDueDate?: string;

  @ApiProperty({ example: 'LOT-98765-V', required: false })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiProperty({ example: 'Dr. Carlos Mendoza', required: false })
  @IsOptional()
  @IsString()
  veterinarianName?: string;

  @ApiProperty({ example: 'Clínica Veterinaria San Borja', required: false })
  @IsOptional()
  @IsString()
  clinicName?: string;

  @ApiProperty({ example: 'Aplicación sin reacciones adversas.', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateDewormingDto {
  @ApiProperty({ example: 'Drontal Plus / NexGard Spectra' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  applicationDate: string;

  @ApiProperty({ example: '2026-06-01', required: false })
  @IsOptional()
  @IsDateString()
  nextDueDate?: string;

  @ApiProperty({ example: 12.5, required: false, description: 'Peso de la mascota en kg al momento de la aplicación' })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  weightAtApplicationKg?: number;

  @ApiProperty({ example: 'Pastilla administrada con alimento húmedo', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateTreatmentDto {
  @ApiProperty({ example: 'Tratamiento Otitis Externa' })
  @IsString()
  @IsNotEmpty()
  treatmentName: string;

  @ApiProperty({ example: 'Gotas Óticas Antibióticas', required: false })
  @IsOptional()
  @IsString()
  medicationName?: string;

  @ApiProperty({ example: '3 gotas cada 12 horas', required: false })
  @IsOptional()
  @IsString()
  dosage?: string;

  @ApiProperty({ example: 'Cada 12 horas', required: false })
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-03-10', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: 'Limpiar el oído antes de colocar las gotas.', required: false })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiProperty({ example: 'Dr. Mendoza', required: false })
  @IsOptional()
  @IsString()
  veterinarianName?: string;

  @ApiProperty({ example: 'active', enum: ['planned', 'active', 'completed', 'canceled'], required: false })
  @IsOptional()
  @IsIn(['planned', 'active', 'completed', 'canceled'])
  status?: string;
}

export class CreateDiagnosisDto {
  @ApiProperty({ example: 'Dermatitis alérgica por pulgas' })
  @IsString()
  @IsNotEmpty()
  diagnosis: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  diagnosisDate: string;

  @ApiProperty({ example: 'Presenta enrojecimiento y prurito en zona lumbar.', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'active', enum: ['active', 'resolved', 'chronic'], required: false })
  @IsOptional()
  @IsIn(['active', 'resolved', 'chronic'])
  status?: string;
}

export class CreateWeightRecordDto {
  @ApiProperty({ example: 14.2, description: 'Peso registrado en kilogramos' })
  @IsNumber()
  @Min(0.05)
  weightKg: number;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  measuredAt: string;

  @ApiProperty({ example: 'Control mensual de peso', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateAppointmentDto {
  @ApiProperty({ example: '2026-03-20T10:30:00Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({ example: 'Control post-tratamiento de otitis' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ example: 'Llevar carnet de vacunación', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMedicalDocumentDto {
  @ApiProperty({
    example: 'prescription',
    enum: ['prescription', 'lab_result', 'diagnosis', 'medical_report', 'vaccination_card', 'other'],
  })
  @IsString()
  @IsIn(['prescription', 'lab_result', 'diagnosis', 'medical_report', 'vaccination_card', 'other'])
  documentType: string;

  @ApiProperty({ example: 'receta_marzo_2026.pdf' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 'medical-documents/pet-123/receta_marzo_2026.pdf' })
  @IsString()
  @IsNotEmpty()
  storagePath: string;

  @ApiProperty({ example: 'application/pdf', required: false })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiProperty({ example: 1048576, required: false })
  @IsOptional()
  @IsNumber()
  fileSizeBytes?: number;
}
