import {
  IsString,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  MaxLength,
  IsUrl,
  IsIn,
} from 'class-validator';

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsUrl({ require_tld: false }, { each: true })
  @MaxLength(2000, { each: true })
  redirectUris?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @IsIn(['openid', 'profile', 'email'], { each: true })
  scopes?: string[];

  @IsOptional()
  @IsString()
  @IsIn(['1', '2'])
  status?: string;
}
