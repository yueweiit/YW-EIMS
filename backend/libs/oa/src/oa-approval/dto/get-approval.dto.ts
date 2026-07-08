import { IsString, IsNotEmpty } from 'class-validator';

export class GetApprovalDto {
  @IsString()
  @IsNotEmpty()
  oa_code: string;
}
