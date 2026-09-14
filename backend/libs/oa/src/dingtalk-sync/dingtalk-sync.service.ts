import { randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression, Timeout } from '@nestjs/schedule';
import type { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@eims/database';
import { DingtalkOaDbService } from '../dingtalk-oa-db/dingtalk-oa-db.service';

const AUTO_USER_SOURCE = 'dingtalk-sync';
const AUTO_USER_ROLE = 'R_USER';
const AUTO_USER_PASSWORD_ROUNDS = 12;

const AUTO_USER_SELECT = {
  id: true,
  userName: true,
  realName: true,
  createBy: true,
  dingTalkSubject: true,
  dingTalkUserId: true,
} satisfies Prisma.UserSelect;

type ManagedUser = Prisma.UserGetPayload<{
  select: typeof AUTO_USER_SELECT;
}>;

type ProvisionAction =
  | 'created'
  | 'updated'
  | 'unchanged'
  | 'skipped'
  | 'conflict';

interface ProvisionResult {
  action: ProvisionAction;
  reason?: string;
}

interface EmployeeSnapshot {
  userId: unknown;
  unionId: unknown;
  name: unknown;
  deptIdList: unknown;
  title: unknown;
}

interface ProvisionUserInput {
  userId: string;
  unionId: string;
  realName: string | null;
}

@Injectable()
export class DingtalkSyncService {
  private readonly logger = new Logger(DingtalkSyncService.name);
  private isSyncing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly dingtalkOaDb: DingtalkOaDbService,
    private readonly configService: ConfigService,
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
      this.logger.error(`DingTalk sync failed: ${this.getErrorMessage(error)}`);
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncEmployees() {
    const users = await this.dingtalkOaDb.fetchCurrentUsers();
    let synced = 0;
    const provisionStats: Record<ProvisionAction, number> = {
      created: 0,
      updated: 0,
      unchanged: 0,
      skipped: 0,
      conflict: 0,
    };
    const autoProvisionEnabled = this.isAutoProvisionEnabled();

    for (const user of users) {
      const snapshot = this.readEmployeeSnapshot(user);
      const userId = this.toText(snapshot?.userId);
      if (!snapshot || !userId) continue;

      const deptId = this.parseDeptId(snapshot.deptIdList);

      await this.prisma.dingEmployee.upsert({
        where: { dingUserid: userId },
        create: {
          dingUserid: userId,
          empName: this.toText(snapshot.name),
          deptId,
          title: this.toText(snapshot.title),
        },
        update: {
          empName: this.toText(snapshot.name),
          deptId,
          title: this.toText(snapshot.title),
        },
      });
      synced++;

      if (!autoProvisionEnabled) continue;

      const unionId = this.toText(snapshot.unionId);
      const result = unionId
        ? await this.provisionEimsUser({
            userId,
            unionId,
            realName: this.toText(snapshot.name),
          })
        : {
            action: 'skipped' as const,
            reason: '员工快照未提供 unionId',
          };
      provisionStats[result.action]++;

      if (result.reason && result.action !== 'unchanged') {
        this.logger.warn(
          `DingTalk user provisioning ${result.action}: ${result.reason}`,
        );
      }
    }

    this.logger.log(`Synced ${synced} employees`);
    if (autoProvisionEnabled) {
      this.logger.log(
        `EIMS user provisioning: created=${provisionStats.created}, updated=${provisionStats.updated}, unchanged=${provisionStats.unchanged}, skipped=${provisionStats.skipped}, conflicts=${provisionStats.conflict}`,
      );
    } else {
      this.logger.log('EIMS user auto-provisioning is disabled');
    }
  }

  private async provisionEimsUser(
    input: ProvisionUserInput,
  ): Promise<ProvisionResult> {
    const [existingByUnionId, existingByUserId, existingByLegacySubject] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { dingTalkSubject: input.unionId },
          select: AUTO_USER_SELECT,
        }),
        this.prisma.user.findUnique({
          where: { dingTalkUserId: input.userId },
          select: AUTO_USER_SELECT,
        }),
        input.userId === input.unionId
          ? Promise.resolve(null)
          : this.prisma.user.findUnique({
              where: { dingTalkSubject: input.userId },
              select: AUTO_USER_SELECT,
            }),
      ]);

    const matchedUsers = [
      existingByUnionId,
      existingByUserId,
      existingByLegacySubject,
    ].filter((user): user is ManagedUser => Boolean(user));
    const matchedUserIds = new Set(matchedUsers.map((user) => user.id));
    if (matchedUserIds.size > 1) {
      return {
        action: 'conflict',
        reason: '同一个钉钉员工已绑定多个 EIMS 用户',
      };
    }

    const existingUser = matchedUsers[0];
    if (existingUser) {
      return this.reconcileExistingUser(existingUser, input);
    }

    const generatedUserName = this.getGeneratedUserName(input.userId);
    const existingByGeneratedName = await this.prisma.user.findUnique({
      where: { userName: generatedUserName },
      select: AUTO_USER_SELECT,
    });
    if (existingByGeneratedName) {
      if (existingByGeneratedName.createBy !== AUTO_USER_SOURCE) {
        return {
          action: 'conflict',
          reason: `自动用户名 ${generatedUserName} 已被手动账号占用`,
        };
      }
      return this.reconcileExistingUser(existingByGeneratedName, input);
    }

    const hashedPassword = await bcrypt.hash(
      randomBytes(32).toString('base64url'),
      AUTO_USER_PASSWORD_ROUNDS,
    );

    try {
      await this.prisma.user.create({
        data: {
          userName: generatedUserName,
          password: hashedPassword,
          realName: input.realName,
          dingTalkSubject: input.unionId,
          dingTalkUserId: input.userId,
          roles: [AUTO_USER_ROLE],
          buttons: [],
          status: '1',
          createBy: AUTO_USER_SOURCE,
        },
        select: AUTO_USER_SELECT,
      });
      return { action: 'created' };
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) throw error;

      const concurrentUser = await this.prisma.user.findUnique({
        where: { dingTalkSubject: input.unionId },
        select: AUTO_USER_SELECT,
      });
      if (concurrentUser) {
        return this.reconcileExistingUser(concurrentUser, input);
      }

      return {
        action: 'conflict',
        reason: '创建自动账号时触发唯一约束冲突',
      };
    }
  }

  private async reconcileExistingUser(
    existing: ManagedUser,
    input: ProvisionUserInput,
  ): Promise<ProvisionResult> {
    if (existing.dingTalkUserId && existing.dingTalkUserId !== input.userId) {
      return {
        action: 'conflict',
        reason: 'unionId 已绑定到不同的钉钉 userId',
      };
    }

    if (
      existing.dingTalkSubject &&
      existing.dingTalkSubject !== input.unionId &&
      existing.dingTalkSubject !== input.userId
    ) {
      return {
        action: 'conflict',
        reason: 'EIMS 用户已绑定其他钉钉登录标识',
      };
    }

    const data: Prisma.UserUpdateInput = {};
    let changed = false;
    if (existing.dingTalkSubject !== input.unionId) {
      data.dingTalkSubject = input.unionId;
      changed = true;
    }
    if (existing.dingTalkUserId !== input.userId) {
      data.dingTalkUserId = input.userId;
      changed = true;
    }
    if (
      existing.createBy === AUTO_USER_SOURCE &&
      input.realName &&
      existing.realName !== input.realName
    ) {
      data.realName = input.realName;
      changed = true;
    }

    if (!changed) return { action: 'unchanged' };

    data.updateBy = AUTO_USER_SOURCE;
    try {
      await this.prisma.user.update({
        where: { id: existing.id },
        data,
      });
      return { action: 'updated' };
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return {
          action: 'conflict',
          reason: '更新自动账号时触发唯一约束冲突',
        };
      }
      throw error;
    }
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

    this.logger.log(
      `Synced ${synced} OA mappings (${skipped} skipped - no business_id)`,
    );
  }

  private readEmployeeSnapshot(value: unknown): EmployeeSnapshot | null {
    if (typeof value !== 'object' || value === null) return null;
    const record = value as Record<string, unknown>;
    return {
      userId: record.user_id ?? record.userId,
      unionId: record.union_id ?? record.unionId ?? record.unionid,
      name: record.name,
      deptIdList: record.dept_id_list ?? record.deptIdList,
      title: record.title,
    };
  }

  private parseDeptId(value: unknown): number | null {
    let parsedValue = value;
    if (typeof value === 'string') {
      try {
        parsedValue = JSON.parse(value);
      } catch {
        parsedValue = [];
      }
    }
    if (!Array.isArray(parsedValue) || parsedValue.length === 0) return null;

    const firstValue = (parsedValue as unknown[])[0];
    const deptId =
      typeof firstValue === 'number'
        ? firstValue
        : typeof firstValue === 'string'
          ? Number.parseInt(firstValue, 10)
          : Number.NaN;
    return Number.isInteger(deptId) ? deptId : null;
  }

  private toText(value: unknown): string | null {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const text = String(value).trim();
    return text || null;
  }

  private getGeneratedUserName(userId: string) {
    return `ding_${userId}`;
  }

  private isAutoProvisionEnabled() {
    return (
      this.configService.get<string>(
        'DINGTALK_AUTO_PROVISION_USERS',
        'true',
      ) === 'true'
    );
  }

  private isUniqueConstraintError(error: unknown) {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return false;
    }
    return error.code === 'P2002';
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message || error.name;
    if (typeof error === 'string') return error;
    try {
      const serialized = JSON.stringify(error);
      return serialized || String(error);
    } catch {
      return String(error);
    }
  }
}
