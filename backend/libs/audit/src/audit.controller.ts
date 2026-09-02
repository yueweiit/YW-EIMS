import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '@eims/auth';
import { PermissionGuard, RequirePermission } from '@eims/roles';
import { AuditService } from './audit.service';

@Controller('audit/security')
@UseGuards(AdminGuard, PermissionGuard)
@RequirePermission('eims:system:audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findPage(
    @Query('current') current?: number,
    @Query('size') size?: number,
    @Query('event') event?: string,
    @Query('result') result?: string,
  ) {
    return this.auditService.findPage(current || 1, size || 20, event, result);
  }
}
