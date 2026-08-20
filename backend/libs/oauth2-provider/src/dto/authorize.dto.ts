import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  MaxLength,
  IsIn,
} from 'class-validator';

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
  @MaxLength(128)
  scope?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  code_challenge?: string;

  @IsOptional()
  @IsString()
  @IsIn(['S256'])
  code_challenge_method?: string;

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
  @MaxLength(512)
  code_challenge?: string;

  @IsOptional()
  @IsString()
  @IsIn(['S256'])
  code_challenge_method?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  consent?: string;
}
