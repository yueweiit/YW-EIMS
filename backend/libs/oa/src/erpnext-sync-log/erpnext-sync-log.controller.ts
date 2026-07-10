import { Controller, Get, Post, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ErpNextSyncLogService } from './erpnext-sync-log.service';
import { QuerySyncLogDto } from './dto/query-sync-log.dto';

@Controller('erpnext-sync-log')
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
  retry(@Param('id', ParseIntPipe) id: number) {
    return this.service.retry(id);
  }
}
