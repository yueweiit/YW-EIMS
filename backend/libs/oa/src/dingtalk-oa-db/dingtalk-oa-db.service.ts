import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

interface ApprovalInstanceRow {
  process_instance_id: string;
  process_code: string;
  title: string | null;
  originator_user_id: string | null;
  originator_dept_id: string | null;
  originator_dept_name: string | null;
  create_time: Date | null;
  business_id: string | null;
}

interface UserSnapshotRow {
  user_id: string;
  name: string | null;
  dept_id_list: any;
  title: string | null;
}

interface DepartmentRow {
  dept_id: string;
  dept_name: string | null;
}

@Injectable()
export class DingtalkOaDbService implements OnModuleDestroy {
  private readonly logger = new Logger(DingtalkOaDbService.name);
  private pool: Pool | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getPool(): Pool {
    if (!this.pool) {
      const connectionString = this.configService.get<string>('DINGTALK_OA_DB_URL');
      if (!connectionString) {
        throw new Error('DINGTALK_OA_DB_URL is not configured');
      }
      this.pool = new Pool({ connectionString });
      this.logger.log('Connected to dingtalk_oa database');
    }
    return this.pool;
  }

  onModuleDestroy() {
    if (this.pool) {
      this.pool.end();
      this.logger.log('Disconnected from dingtalk_oa database');
    }
  }

  async fetchCurrentUsers(): Promise<UserSnapshotRow[]> {
    const pool = this.getPool();
    const result = await pool.query<UserSnapshotRow>(`
      SELECT user_id, name, dept_id_list, title
      FROM ding_user_snapshot
      WHERE is_current = true AND fetch_status = 'success'
    `);
    return result.rows;
  }

  async fetchApprovalInstances(): Promise<ApprovalInstanceRow[]> {
    const pool = this.getPool();
    const result = await pool.query<ApprovalInstanceRow>(`
      SELECT process_instance_id, process_code, title,
             originator_user_id, originator_dept_id,
             COALESCE(originator_dept_name, raw_payload->>'originatorDeptName') as originator_dept_name,
             create_time,
             raw_payload->>'businessId' as business_id
      FROM ding_approval_instance
      WHERE deleted_at IS NULL
    `);
    return result.rows;
  }

  async fetchDistinctDepartments(): Promise<DepartmentRow[]> {
    const pool = this.getPool();
    const result = await pool.query<DepartmentRow>(`
      SELECT DISTINCT originator_dept_id as dept_id,
             COALESCE(originator_dept_name, raw_payload->>'originatorDeptName') as dept_name
      FROM ding_approval_instance
      WHERE deleted_at IS NULL
        AND originator_dept_id IS NOT NULL
        AND COALESCE(originator_dept_name, raw_payload->>'originatorDeptName') IS NOT NULL
        AND COALESCE(originator_dept_name, raw_payload->>'originatorDeptName') != ''
    `);
    return result.rows;
  }
}
