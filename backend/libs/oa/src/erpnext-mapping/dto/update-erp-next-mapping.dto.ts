import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';

export class UpdateErpNextMappingDto {
  @IsString()
  @IsOptional()
  @IsIn(['ITEM_GROUP', 'MOLD_ITEM_GROUP', 'PRODUCT_ITEM_GROUP', 'UNIT'])
  type?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  sourceKey?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  targetValue?: string;
}
