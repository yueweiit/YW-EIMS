import { IsString, IsOptional } from 'class-validator';
import { PaginationDto } from '@eims/common';

export class QueryMaterialDto extends PaginationDto {
  @IsString()
  @IsOptional()
  applicant?: string;

  @IsString()
  @IsOptional()
  materialName?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  codePrefix?: string;

  @IsString()
  @IsOptional()
  unitCode?: string;

  @IsString()
  @IsOptional()
  unit?: string;
}
