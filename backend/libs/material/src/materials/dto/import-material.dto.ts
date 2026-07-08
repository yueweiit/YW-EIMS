import { IsArray, ValidateNested, IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ImportMaterialRowDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  applicant: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  materialName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  codePrefix: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  unit?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  specifications?: string;
}

export class ImportMaterialDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportMaterialRowDto)
  rows: ImportMaterialRowDto[];
}
