import { IsString, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateMoldCodeDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  moldType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  moldName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.toUpperCase().trim() : value,
  )
  moldPrefix?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  materialName?: string;
}
