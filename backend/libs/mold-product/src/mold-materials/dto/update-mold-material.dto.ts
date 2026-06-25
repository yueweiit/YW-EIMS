import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';

export class UpdateMoldMaterialDto {
  @IsString()
  @IsOptional()
  @MaxLength(10)
  @Matches(/^\d+$/, { message: '材质编码必须为纯数字' })
  typeCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  typeName?: string;
}
