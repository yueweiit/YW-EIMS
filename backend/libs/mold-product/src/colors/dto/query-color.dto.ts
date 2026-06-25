import { IsString, IsOptional } from 'class-validator';
import { PaginationDto } from '@eims/common';

export class QueryColorDto extends PaginationDto {
  @IsString()
  @IsOptional()
  colorCode?: string;

  @IsString()
  @IsOptional()
  colorName?: string;
}
