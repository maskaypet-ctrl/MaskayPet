import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'juan.perez@example.com', description: 'Correo electrónico del usuario' })
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  email: string;

  @ApiProperty({ example: 'MiClaveSegura123!', minLength: 8, description: 'Contraseña de la cuenta' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @ApiProperty({ example: 'Juan', description: 'Nombre del usuario' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  firstName: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellido del usuario' })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  lastName: string;

  @ApiProperty({ example: '+51987654321', required: false, description: 'Teléfono de contacto' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'juan.perez@example.com', description: 'Correo electrónico' })
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  email: string;

  @ApiProperty({ example: 'MiClaveSegura123!', description: 'Contraseña' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;

  @ApiProperty({ example: 'iPhone 15 Pro', required: false })
  @IsOptional()
  @IsString()
  deviceName?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Token de refresco emitido en el login' })
  @IsString()
  @IsNotEmpty({ message: 'El refresh token es obligatorio' })
  refreshToken: string;
}
