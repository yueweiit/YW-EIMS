import { request } from '../request';

export interface SecurityAuditRecord {
  id: number;
  event: string;
  result: 'success' | 'failure' | 'denied' | string;
  userId?: number | null;
  userName?: string | null;
  clientId?: string | null;
  systemCode?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  detail?: Record<string, unknown> | null;
  createdAt: string;
}

export interface SecurityAuditPageParams {
  current: number;
  size: number;
  event?: string;
  result?: string;
}

export interface SecurityAuditPageData {
  records: SecurityAuditRecord[];
  total: number;
  current: number;
  size: number;
}

export function fetchSecurityAuditPage(params: SecurityAuditPageParams) {
  return request<SecurityAuditPageData>({
    url: '/audit/security',
    method: 'get',
    params
  });
}
