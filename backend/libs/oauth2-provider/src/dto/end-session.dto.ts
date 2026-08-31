import { IsOptional, IsString, MaxLength } from 'class-validator';

export class EndSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  id_token_hint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  client_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  post_logout_redirect_uri?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  state?: string;
}
