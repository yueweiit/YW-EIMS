import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateBindingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  appUserId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  appUsername?: string | null;

}
