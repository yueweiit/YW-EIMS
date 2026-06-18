import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

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
