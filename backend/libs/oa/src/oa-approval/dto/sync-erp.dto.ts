import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SyncErpDto {
  @IsString()
  @IsNotEmpty()
  org: string;

  @IsString()
  @IsNotEmpty()
  supplier: string;

  @IsString()
  @IsOptional()
  supplier_code?: string;

  @IsString()
  @IsOptional()
  tax_code?: string;

  @IsString()
  @IsNotEmpty()
  doc_date: string;

  @IsString()
  @IsNotEmpty()
  oa_code: string;

  @IsString()
  @IsOptional()
  waybill?: string;

  @IsString()
  @IsOptional()
  remark?: string;
}
