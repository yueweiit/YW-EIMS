import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  userName?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  realName?: string;

  @IsString()
  @IsOptional()
  dingTalkSubject?: string;

  @IsString({ each: true })
  @IsOptional()
  roles?: string[];

  @IsString({ each: true })
  @IsOptional()
  buttons?: string[];

  @IsString()
  @IsIn(['1', '2'])
  @IsOptional()
  status?: string;
}
