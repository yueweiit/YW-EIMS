import { IsString, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateMoldDto {
  @IsString()
  @IsOptional()
  @MaxLength(30)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.toUpperCase().trim() : value,
  )
  moldCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  phoneName?: string;
}
