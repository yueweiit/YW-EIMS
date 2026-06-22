import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(3)
  unitCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit: string;
}
