import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class AuthorizeDto {
  @IsString()
  @IsNotEmpty()
  response_type: string;

  @IsString()
  @IsNotEmpty()
  client_id: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  redirect_uri: string;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  state?: string;
}

export class AuthorizeConfirmDto {
  @IsString()
  @IsNotEmpty()
  client_id: string;

  @IsString()
  @IsNotEmpty()
  redirect_uri: string;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  consent?: string;
}
