import { IsArray, ValidateNested, IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ImportProductRowDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  productType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  phoneShortName: string;
}

export class ImportProductDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportProductRowDto)
  rows: ImportProductRowDto[];
}
