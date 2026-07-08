import { Controller, Post, Body } from '@nestjs/common';
import { OaApprovalService } from './oa-approval.service';
import { GetApprovalDto } from './dto/get-approval.dto';
import { SyncErpDto } from './dto/sync-erp.dto';

@Controller('oa/approval')
export class OaApprovalController {
  constructor(private readonly oaApprovalService: OaApprovalService) {}

  @Post('detail')
  async getApprovalDetail(@Body() dto: GetApprovalDto) {
    return this.oaApprovalService.getApprovalDetail(dto.oa_code);
  }

  @Post('check-cache')
  async checkCache(@Body() dto: GetApprovalDto) {
    const hit = await this.oaApprovalService.checkCache(dto.oa_code);
    return { hit };
  }

  @Post('sync-erp')
  async syncToErp(@Body() body: { modal_data: SyncErpDto; oa_details: Record<string, any> }) {
    return this.oaApprovalService.syncToErp(body.modal_data, body.oa_details);
  }
}
