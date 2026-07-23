import {
  IsString,
  IsOptional,
  IsIn,
  IsEmail,
  ValidateIf,
} from 'class-validator';

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

  @ValidateIf((_object, value: unknown) => value !== '')
  @IsEmail()
  @IsOptional()
  email?: string;

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
