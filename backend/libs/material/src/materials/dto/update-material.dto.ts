import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateMaterialDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  applicant?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  materialName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  codePrefix?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  unit?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  specifications?: string;
}
