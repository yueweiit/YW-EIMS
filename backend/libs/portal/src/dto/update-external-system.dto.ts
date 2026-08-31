import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateExternalSystemDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  entryUrl?: string;

  @IsOptional()
  @IsIn(['link', 'oauth2'])
  authMode?: string;

  @IsOptional()
  @IsIn(['roles', 'all'])
  accessMode?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  allowedRoles?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  helpUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedbackUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contact?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  oauthClientId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999999)
  sort?: number;

  @IsOptional()
  @IsIn(['1', '2'])
  status?: string;
}
