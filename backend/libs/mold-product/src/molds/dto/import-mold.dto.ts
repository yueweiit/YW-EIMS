import { IsArray, ValidateNested, IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ImportMoldRowDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  moldCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  phoneName: string;
}

export class ImportMoldDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportMoldRowDto)
  rows: ImportMoldRowDto[];
}
