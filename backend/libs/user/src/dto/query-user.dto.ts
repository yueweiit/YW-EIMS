import { IsString, IsOptional, IsIn } from 'class-validator';
import { PaginationDto } from '@eims/common';

export class QueryUserDto extends PaginationDto {
  @IsString()
  @IsOptional()
  userName?: string;

  @IsString()
  @IsIn(['1', '2'])
  @IsOptional()
  status?: string;
}
