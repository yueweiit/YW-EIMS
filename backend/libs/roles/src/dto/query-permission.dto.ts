import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@eims/common';

export class QueryPermissionDto extends PaginationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsIn(['menu', 'button', 'api'])
  @IsOptional()
  type?: string;

  @IsString()
  @IsIn(['1', '2'])
  @IsOptional()
  status?: string;
}
