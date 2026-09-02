import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  name?: string;

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
