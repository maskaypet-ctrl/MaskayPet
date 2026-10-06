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
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  showPetName?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  showPhoto?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  showBreed?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  showOwnerName?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  showOwnerPhone?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  showContacts?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  showMedicalInfo?: boolean;

  @ApiProperty({ example: 'Recompensa por devolución segura. Por favor llame de inmediato.', required: false })
  @IsOptional()
  @IsString()
  emergencyMessage?: string;
}
