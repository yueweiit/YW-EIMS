import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  @IsIn(['menu', 'button', 'api'])
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  systemCode?: string;

  @IsString()
  @IsOptional()
  parentCode?: string;

  @IsString()
  @IsOptional()
  routePath?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  @Max(999999)
  @IsOptional()
  sort?: number;

  @IsString()
  @IsIn(['1', '2'])
  @IsOptional()
  status?: string;
}
