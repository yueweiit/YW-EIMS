import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateBindingDto {
  @IsInt()
  @Min(1)
  appUserId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  appUsername?: string | null;

}
