import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';

export class CreateColorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  @Matches(/^\d+$/, { message: '颜色编码必须为纯数字' })
  colorCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  colorName: string;
}
