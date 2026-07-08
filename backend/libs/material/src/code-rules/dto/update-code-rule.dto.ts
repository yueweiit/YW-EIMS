import { IsString, IsOptional, IsInt, Min, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCodeRuleDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  explainContent?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  prefixLength?: number;
}
