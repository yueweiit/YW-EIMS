import { IsString, IsOptional } from 'class-validator';
import { PaginationDto } from '@eims/common';

export class QueryProductDto extends PaginationDto {
  @IsString()
  @IsOptional()
  productType?: string;

  @IsString()
  @IsOptional()
  phoneShortName?: string;

  @IsString()
  @IsOptional()
  itemCode?: string;
}
