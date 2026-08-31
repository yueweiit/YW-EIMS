import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateRoleAccessDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  systemCodes?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionCodes?: string[];
}
