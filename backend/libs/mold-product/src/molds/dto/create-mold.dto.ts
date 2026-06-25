import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateMoldDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.toUpperCase().trim() : value,
  )
  moldCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  phoneName: string;
}
