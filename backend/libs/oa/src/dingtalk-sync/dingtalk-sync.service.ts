import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Timeout } from '@nestjs/schedule';
import { PrismaService } from '@eims/database';
import { DingtalkOaDbService } from '../dingtalk-oa-db/dingtalk-oa-db.service';

@Injectable()
export class DingtalkSyncService {
  private readonly logger = new Logger(DingtalkSyncService.name);
  private isSyncing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly dingtalkOaDb: DingtalkOaDbService,
  ) {}

  @Timeout(0)
  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncAll() {
    if (this.isSyncing) {
      this.logger.warn('DingTalk sync already in progress, skipping...');
      return;
    }

    this.isSyncing = true;
    this.logger.log('Starting DingTalk data sync...');

    try {
      await this.syncEmployees();
      await this.syncDepartments();
      await this.syncOaMappings();
      this.logger.log('DingTalk data sync completed');
    } catch (error) {
      this.logger.error(`DingTalk sync failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncEmployees() {
    const users = await this.dingtalkOaDb.fetchCurrentUsers();
    let synced = 0;

    for (const user of users) {
      if (!user.user_id) continue;

      const deptIdList = Array.isArray(user.dept_id_list)
        ? user.dept_id_list
        : typeof user.dept_id_list === 'string'
          ? (() => { try { return JSON.parse(user.dept_id_list); } catch { return []; } })()
          : [];

      const deptId = deptIdList.length > 0 ? parseInt(deptIdList[0], 10) : null;

      await this.prisma.dingEmployee.upsert({
        where: { dingUserid: user.user_id },
        create: {
          dingUserid: user.user_id,
          empName: user.name || null,
          deptId: isNaN(deptId as number) ? null : deptId,
          title: user.title || null,
        },
        update: {
          empName: user.name || null,
          deptId: isNaN(deptId as number) ? null : deptId,
          title: user.title || null,
        },
      });
      synced++;
    }

    this.logger.log(`Synced ${synced} employees`);
  }

  private async syncDepartments() {
    const departments = await this.dingtalkOaDb.fetchDistinctDepartments();
    let synced = 0;

    for (const dept of departments) {
      const deptId = parseInt(dept.dept_id, 10);
      if (isNaN(deptId) || !dept.dept_name) continue;

      await this.prisma.dingDepartment.upsert({
        where: { deptId },
        create: {
          deptId,
          deptName: dept.dept_name,
        },
        update: {
          deptName: dept.dept_name,
        },
      });
      synced++;
    }

    this.logger.log(`Synced ${synced} departments`);
  }

  private async syncOaMappings() {
    const instances = await this.dingtalkOaDb.fetchApprovalInstances();
    let synced = 0;
    let skipped = 0;

    for (const instance of instances) {
      if (!instance.business_id || !instance.process_instance_id) {
        skipped++;
        continue;
      }

      await this.prisma.oaMapping.upsert({
        where: { oaCode: instance.business_id },
        create: {
          oaCode: instance.business_id,
          instanceId: instance.process_instance_id,
          processCode: instance.process_code || null,
          formName: instance.title || null,
          dingCreateTime: instance.create_time || null,
        },
        update: {
          instanceId: instance.process_instance_id,
          processCode: instance.process_code || null,
          formName: instance.title || null,
          dingCreateTime: instance.create_time || null,
          updateTime: new Date(),
        },
      });
      synced++;
    }

    this.logger.log(`Synced ${synced} OA mappings (${skipped} skipped - no business_id)`);
  }
}
