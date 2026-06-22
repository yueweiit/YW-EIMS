import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateUnitDto {
  @IsString()
  @IsOptional()
  @MaxLength(3)
  unitCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  unit?: string;
}
