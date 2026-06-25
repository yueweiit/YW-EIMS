import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';

export class CreateMoldMaterialDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  @Matches(/^\d+$/, { message: '材质编码必须为纯数字' })
  typeCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  typeName: string;
}
