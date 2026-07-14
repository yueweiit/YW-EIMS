import { IsNotEmpty, IsString } from 'class-validator';

export class DingTalkExchangeDto {
  @IsString()
  @IsNotEmpty()
  ticket: string;
}
