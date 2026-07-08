import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCodeRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  codePrefix: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  explainContent: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  prefixLength?: number;
}
