import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.toUpperCase().trim() : value,
  )
  productCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  productType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  productName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  colorName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  colorCode: string;
}
