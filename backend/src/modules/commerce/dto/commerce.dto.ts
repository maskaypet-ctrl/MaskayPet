import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000001' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ example: 'Av. Larco 1234, Dpto 402' })
  @IsString()
  @IsNotEmpty()
  shippingAddress: string;

  @ApiProperty({ example: 'Lima' })
  @IsString()
  @IsNotEmpty()
  shippingCity: string;

  @ApiProperty({ example: 'Perú', required: false })
  @IsOptional()
  @IsString()
  shippingCountry?: string;

  @ApiProperty({ example: 'BIENVENIDO10', required: false })
  @IsOptional()
  @IsString()
  couponCode?: string;
}
