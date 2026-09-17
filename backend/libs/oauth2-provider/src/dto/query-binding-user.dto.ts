import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '@eims/common';

export class QueryBindingUserDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  clientId?: string;
}
