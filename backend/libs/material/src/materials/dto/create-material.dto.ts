import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  applicant: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  materialName: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  unit?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  specifications?: string;
}
