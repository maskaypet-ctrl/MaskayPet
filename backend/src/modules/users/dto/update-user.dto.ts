import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Juan', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Pérez', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: '+51987654321', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'avatars/user-123.jpg', required: false })
  @IsOptional()
  @IsString()
  avatarStoragePath?: string;
}
