import { IsString, IsOptional } from 'class-validator';
import { PaginationDto } from '@eims/common';

export class QueryCodeRuleDto extends PaginationDto {
  @IsString()
  @IsOptional()
  codePrefix?: string;

  @IsString()
  @IsOptional()
  explainContent?: string;
}
