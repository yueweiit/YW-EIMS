import { IsString, IsNotEmpty, MaxLength, IsIn } from 'class-validator';

export class CreateErpNextMappingDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['ITEM_GROUP', 'MOLD_ITEM_GROUP', 'PRODUCT_ITEM_GROUP', 'UNIT'])
  type: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sourceKey: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  targetValue: string;
}
