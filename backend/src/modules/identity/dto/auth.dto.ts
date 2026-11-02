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

export class ChangePasswordDto {
  @ApiProperty({ description: 'Contraseña actual del usuario' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es obligatoria' })
  currentPassword: string;

  @ApiProperty({ description: 'Nueva contraseña (mínimo 8 caracteres)', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  newPassword: string;
}

export class AdminResetPasswordDto {
  @ApiProperty({ description: 'Nueva contraseña temporal asignada por el administrador', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  newPassword: string;
}

export class RequestPasswordCodeDto {
  @ApiProperty({ example: 'juan.perez@example.com', description: 'Correo electrónico de la cuenta' })
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido' })
  email: string;
}

export class ConfirmPasswordCodeDto {
  @ApiProperty({ example: 'juan.perez@example.com', description: 'Correo electrónico de la cuenta' })
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido' })
  email: string;

  @ApiProperty({ example: '482910', description: 'Código de verificación de 6 dígitos enviado al correo' })
  @IsString()
  @IsNotEmpty({ message: 'El código de verificación es obligatorio' })
  code: string;

  @ApiProperty({ description: 'Nueva contraseña (mínimo 8 caracteres)', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  newPassword: string;
}
