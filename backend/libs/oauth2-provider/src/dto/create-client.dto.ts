import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  MaxLength,
  IsUrl,
  IsIn,
} from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsUrl({ require_tld: false }, { each: true })
  @MaxLength(2000, { each: true })
  redirectUris: string[];

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
