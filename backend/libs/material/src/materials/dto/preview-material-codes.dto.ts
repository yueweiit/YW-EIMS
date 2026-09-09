import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';

export class PreviewMaterialCodesDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(10, { each: true })
  prefixes: string[];
}
