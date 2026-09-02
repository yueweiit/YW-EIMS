import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PermissionGuard, RequirePermission } from '@eims/roles';
import { OaApprovalService } from './oa-approval.service';
import { GetApprovalDto } from './dto/get-approval.dto';
import { SyncErpDto } from './dto/sync-erp.dto';

@Controller('oa/approval')
@UseGuards(PermissionGuard)
@RequirePermission('eims:oa:approval')
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
  @RequirePermission('eims:oa:approval:sync')
  async syncToErp(@Body() body: { modal_data: SyncErpDto; oa_details: Record<string, any> }) {
    return this.oaApprovalService.syncToErp(body.modal_data, body.oa_details);
  }
}
