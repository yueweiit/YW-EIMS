import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';

export class UpdateColorDto {
  @IsString()
  @IsOptional()
  @MaxLength(10)
  @Matches(/^\d+$/, { message: '颜色编码必须为纯数字' })
  colorCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  colorName?: string;
}
