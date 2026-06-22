import { IsString, IsOptional } from 'class-validator';
import { PaginationDto } from '@eims/common';

export class QueryUnitDto extends PaginationDto {
  @IsString()
  @IsOptional()
  unitCode?: string;

  @IsString()
  @IsOptional()
  unit?: string;
}
