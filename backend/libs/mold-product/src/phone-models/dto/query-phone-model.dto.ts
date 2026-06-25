import { IsString, IsOptional } from 'class-validator';
import { PaginationDto } from '@eims/common';

export class QueryPhoneModelDto extends PaginationDto {
  @IsString()
  @IsOptional()
  phoneName?: string;
}
