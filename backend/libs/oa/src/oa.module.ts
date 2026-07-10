import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DingTalkService } from './dingtalk/dingtalk.service';
import { ErpService } from './erp/erp.service';
import { ErpSyncService } from './erp-sync/erp-sync.service';
import { OaApprovalService } from './oa-approval/oa-approval.service';
import { OaApprovalController } from './oa-approval/oa-approval.controller';
import { OaSearchService } from './oa-search/oa-search.service';
import { OaSearchController } from './oa-search/oa-search.controller';
import { MaterialMatcher } from './helpers/material-matcher';
import { DingtalkOaDbService } from './dingtalk-oa-db/dingtalk-oa-db.service';
import { DingtalkSyncService } from './dingtalk-sync/dingtalk-sync.service';
import { ErpNextService } from './erpnext/erpnext.service';
import { ErpNextMappingController } from './erpnext-mapping/erpnext-mapping.controller';
import { ErpNextMappingService } from './erpnext-mapping/erpnext-mapping.service';
import { ErpNextSyncLogController } from './erpnext-sync-log/erpnext-sync-log.controller';
import { ErpNextSyncLogService } from './erpnext-sync-log/erpnext-sync-log.service';

@Module({
  imports: [HttpModule],
  controllers: [OaApprovalController, OaSearchController, ErpNextMappingController, ErpNextSyncLogController],
  providers: [
    DingTalkService,
    ErpService,
    ErpSyncService,
    ErpNextService,
    OaApprovalService,
    OaSearchService,
    MaterialMatcher,
    DingtalkOaDbService,
    DingtalkSyncService,
    ErpNextMappingService,
    ErpNextSyncLogService,
  ],
  exports: [DingTalkService, ErpService, ErpNextService, OaApprovalService, OaSearchService],
})
export class OaModule {}
