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

@Module({
  imports: [HttpModule],
  controllers: [OaApprovalController, OaSearchController],
  providers: [
    DingTalkService,
    ErpService,
    ErpSyncService,
    OaApprovalService,
    OaSearchService,
    MaterialMatcher,
    DingtalkOaDbService,
    DingtalkSyncService,
  ],
  exports: [DingTalkService, ErpService, OaApprovalService, OaSearchService],
})
export class OaModule {}
