import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateCodeRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  codePrefix: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  explainContent: string;
}
