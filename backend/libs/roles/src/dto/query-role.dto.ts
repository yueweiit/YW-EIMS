import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@eims/common';

export class QueryRoleDto extends PaginationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsIn(['1', '2'])
  @IsOptional()
  status?: string;
}
