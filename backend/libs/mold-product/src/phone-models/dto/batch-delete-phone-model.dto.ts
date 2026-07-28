import { IsArray, IsInt, ArrayMinSize } from 'class-validator';

export class BatchDeletePhoneModelDto {
  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(1, { message: '请至少选择一个要删除的手机型号' })
  ids: number[];
}
