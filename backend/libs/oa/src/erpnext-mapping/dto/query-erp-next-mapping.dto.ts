import { IsString, IsOptional, IsIn } from 'class-validator';
import { PaginationDto } from '@eims/common';

export class QueryErpNextMappingDto extends PaginationDto {
  @IsString()
  @IsOptional()
  @IsIn(['ITEM_GROUP', 'MOLD_ITEM_GROUP', 'PRODUCT_ITEM_GROUP', 'UNIT'])
  type?: string;

  @IsString()
  @IsOptional()
  sourceKey?: string;
}
