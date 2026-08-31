import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  MaxLength,
  IsIn,
  MinLength,
  Matches,
} from 'class-validator';

export class AuthorizeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  response_type: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  client_id: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  redirect_uri: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  scope?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(43)
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9_-]+$/)
  code_challenge: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['S256'])
  code_challenge_method: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  state: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nonce?: string;
}

export class AuthorizeConfirmDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  client_id: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  redirect_uri: string;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(43)
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9_-]+$/)
  code_challenge: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['S256'])
  code_challenge_method: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  state: string;

  @IsOptional()
  @IsString()
  consent?: string;
}

export class AuthorizeTransactionQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9_-]{43,128}$/)
  transaction_id: string;
}

export class AuthorizeTransactionConfirmDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9_-]{43,128}$/)
  transaction_id: string;

  @IsString()
  @IsIn(['true', 'false'])
  consent: string;
}
