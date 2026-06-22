import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateCodeRuleDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  explainContent?: string;
}
