import { IsString, IsOptional } from 'class-validator';
import { PaginationDto } from '@eims/common';

export class QueryProductCodeDto extends PaginationDto {
  @IsString()
  @IsOptional()
  productCode?: string;

  @IsString()
  @IsOptional()
  productType?: string;

  @IsString()
  @IsOptional()
  productName?: string;
}
