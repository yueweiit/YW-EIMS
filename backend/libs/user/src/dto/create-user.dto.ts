import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsEmail,
  ValidateIf,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsString()
  @IsNotEmpty()
  password: string;

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
