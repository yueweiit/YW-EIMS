import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class TokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  grant_type: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  redirect_uri?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(43)
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9._~-]+$/)
  code_verifier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  client_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  client_secret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  refresh_token?: string;
}

export class RevokeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  token: string;

  @IsOptional()
  @IsString()
  token_type_hint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  client_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  client_secret?: string;
}
