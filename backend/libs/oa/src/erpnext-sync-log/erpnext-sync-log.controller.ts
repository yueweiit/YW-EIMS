import { Controller, Get, Post, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { PermissionGuard, RequirePermission } from '@eims/roles';
import { ErpNextSyncLogService } from './erpnext-sync-log.service';
import { QuerySyncLogDto } from './dto/query-sync-log.dto';

@Controller('erpnext-sync-log')
@UseGuards(PermissionGuard)
@RequirePermission('eims:system:erpnext-sync-log')
export class ErpNextSyncLogController {
  constructor(private readonly service: ErpNextSyncLogService) {}

  @Get('page')
  findPage(@Query() query: QuerySyncLogDto) {
    return this.service.findPage(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post(':id/retry')
  @RequirePermission('eims:system:erpnext-sync-log:retry')
  retry(@Param('id', ParseIntPipe) id: number) {
    return this.service.retry(id);
  }
}
