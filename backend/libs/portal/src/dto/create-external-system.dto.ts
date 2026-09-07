import { Transform } from 'class-transformer';
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

export class CreateExternalSystemDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString({ message: '系统编码必须是字符串' })
  @Matches(/^[a-z0-9][a-z0-9_-]{1,49}$/, {
    message:
      '系统编码须为2～50位，只能包含小写字母、数字、下划线和短横线，并以字母或数字开头',
  })
  code!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string;

  @IsString()
  @MaxLength(2000)
  entryUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  ssoStartUrl?: string | null;

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
  helpUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedbackUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contact?: string;

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
