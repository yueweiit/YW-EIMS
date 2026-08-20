import { IsInt, IsString, IsOptional, Min, MaxLength } from 'class-validator';

export class CreateBindingDto {
  @IsInt()
  @Min(1)
  ssoUserId!: number;

  @IsString()
  @MaxLength(128)
  clientId!: string;

  @IsInt()
  @Min(1)
  appUserId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  appUsername?: string;
}
