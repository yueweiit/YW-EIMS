import { IsString, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  productType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  phoneShortName?: string;
}
