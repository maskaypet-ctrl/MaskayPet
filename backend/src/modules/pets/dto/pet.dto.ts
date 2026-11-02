import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePetDto {
  @ApiProperty({ example: 'Max', description: 'Nombre de la mascota' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la mascota es obligatorio' })
  name: string;

  @ApiProperty({ example: 'Perro', description: 'Especie (Perro, Gato, etc.)' })
  @IsString()
  @IsNotEmpty({ message: 'La especie es obligatoria' })
  species: string;

  @ApiProperty({ example: 'Golden Retriever', required: false })
  @IsOptional()
  @IsString()
  breed?: string;

  @ApiProperty({ example: 'male', enum: ['male', 'female', 'unknown'], required: false })
  @IsOptional()
  @IsIn(['male', 'female', 'unknown'])
  sex?: string;

  @ApiProperty({ example: '2022-05-15', required: false })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiProperty({ example: 'Dorado', required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ example: '985141002345678', required: false })
  @IsOptional()
  @IsString()
  microchipNumber?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isSterilized?: boolean;

  @ApiProperty({ example: 'Amigable, muy juguetón y dócil con los niños.', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'pets/max-photo.jpg', required: false })
  @IsOptional()
  @IsString()
  photoStoragePath?: string;

  @ApiProperty({ example: false, required: false, description: 'Si se desea crear y activar el código QR inmediatamente al crear la mascota' })
  @IsOptional()
  @IsBoolean()
  createQr?: boolean;
}

export class UpdatePetDto {
  @ApiProperty({ example: 'Max', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Perro', required: false })
  @IsOptional()
  @IsString()
  species?: string;

  @ApiProperty({ example: 'Golden Retriever', required: false })
  @IsOptional()
  @IsString()
  breed?: string;

  @ApiProperty({ example: 'male', enum: ['male', 'female', 'unknown'], required: false })
  @IsOptional()
  @IsIn(['male', 'female', 'unknown'])
  sex?: string;

  @ApiProperty({ example: '2022-05-15', required: false })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiProperty({ example: 'Dorado', required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ example: '985141002345678', required: false })
  @IsOptional()
  @IsString()
  microchipNumber?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isSterilized?: boolean;

  @ApiProperty({ example: 'Amigable y juguetón', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'pets/max-photo.jpg', required: false })
  @IsOptional()
  @IsString()
  photoStoragePath?: string;

  @ApiProperty({ example: 'active', enum: ['active', 'deceased', 'transferred', 'archived'], required: false })
  @IsOptional()
  @IsIn(['active', 'deceased', 'transferred', 'archived'])
  status?: string;
}

export class CreatePetContactDto {
  @ApiProperty({ example: 'María Pérez', description: 'Nombre completo del contacto' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Hermana / Co-propietaria', required: false })
  @IsOptional()
  @IsString()
  relationship?: string;

  @ApiProperty({ example: '+51999888777', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'maria@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+51999888777', required: false })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  priority?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  canReceiveLostAlerts?: boolean;
}

export class UpdatePublicProfileDto {
  @IsOptional()
  @IsString()
  pet_id?: string;

  @IsOptional()
  @IsString()
  updated_at?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  showPetName?: boolean;

  @IsOptional()
  @IsBoolean()
  show_pet_name?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  showPhoto?: boolean;

  @IsOptional()
  @IsBoolean()
  show_photo?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  showBreed?: boolean;

  @IsOptional()
  @IsBoolean()
  show_breed?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  showOwnerName?: boolean;

  @IsOptional()
  @IsBoolean()
  show_owner_name?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  showOwnerPhone?: boolean;

  @IsOptional()
  @IsBoolean()
  show_owner_phone?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  showContacts?: boolean;

  @IsOptional()
  @IsBoolean()
  show_contacts?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  showMedicalInfo?: boolean;

  @IsOptional()
  @IsBoolean()
  show_medical_info?: boolean;

  @ApiProperty({ example: 'Recompensa por devolución segura. Por favor llame de inmediato.', required: false })
  @IsOptional()
  @IsString()
  emergencyMessage?: string;

  @IsOptional()
  @IsString()
  emergency_message?: string;
}

export class AddCollaboratorDto {
  @ApiProperty({ example: 'familiar@ejemplo.com', description: 'Correo electrónico registrado del co-cuidador' })
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido' })
  email: string;

  @ApiProperty({ example: 'caregiver', enum: ['caregiver', 'viewer'], required: false })
  @IsOptional()
  @IsIn(['caregiver', 'viewer'])
  role?: 'caregiver' | 'viewer';
}
