import { IsString, IsOptional, IsIn } from 'class-validator';
import { PaginationDto } from '@eims/common';

export class QuerySyncLogDto extends PaginationDto {
  @IsString()
  @IsOptional()
  @IsIn(['MOLD', 'PRODUCT', 'MATERIAL'])
  entityType?: string;

  @IsString()
  @IsOptional()
  @IsIn(['PENDING', 'SUCCESS', 'FAILED', 'SKIPPED'])
  status?: string;

  @IsString()
  @IsOptional()
  entityCode?: string;
}
