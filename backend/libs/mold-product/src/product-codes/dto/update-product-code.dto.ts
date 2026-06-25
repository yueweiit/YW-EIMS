import { IsString, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProductCodeDto {
  @IsString()
  @IsOptional()
  @MaxLength(20)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.toUpperCase().trim() : value,
  )
  productCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  productType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  productName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  colorName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  colorCode?: string;
}
