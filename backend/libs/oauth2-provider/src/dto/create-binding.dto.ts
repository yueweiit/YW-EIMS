import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBindingDto {
  @IsInt()
  @Min(1)
  ssoUserId!: number;

  @IsString()
  @MaxLength(128)
  clientId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  appUserId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  appUsername?: string;

}
