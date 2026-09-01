import { request } from '../request';

export type PortalBindingStatus = 'bound' | 'unbound' | 'not_required' | 'not_configured';

export interface PortalSystemRecord {
  code: string;
  name: string;
  description?: string | null;
  icon: string;
  color: string;
  category: string;
  authMode: 'link' | 'oauth2';
  roles: string[];
  bindingStatus: PortalBindingStatus;
  canLaunch: boolean;
  appUserId?: string | null;
  appUsername?: string | null;
  helpUrl?: string | null;
  feedbackUrl?: string | null;
  contact?: string | null;
}

export interface PortalSystemLaunchResult {
  code: string;
  name: string;
  url: string;
  authMode: 'link' | 'oauth2';
  bindingStatus: PortalBindingStatus;
  appUserId?: string | null;
  appUsername?: string | null;
}

export interface ExternalSystemRecord {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  icon: string;
  color: string;
  entryUrl: string;
  effectiveEntryUrl?: string;
  ssoStartUrl?: string | null;
  authMode: 'link' | 'oauth2';
  accessMode: 'roles' | 'all';
  allowedRoles: string[];
  category: string;
  helpUrl?: string | null;
  feedbackUrl?: string | null;
  contact?: string | null;
  oauthClientId?: string | null;
  sort: number;
  status: Api.Common.EnableStatus;
  createBy?: string | null;
  createTime: string;
  updateBy?: string | null;
  updateTime: string;
  oauthClient?: {
    clientId: string;
    name: string;
    status: Api.Common.EnableStatus;
  } | null;
}

export interface ExternalSystemPageParams {
  current: number;
  size: number;
  name?: string;
  status?: Api.Common.EnableStatus;
}

export interface ExternalSystemPageData {
  records: ExternalSystemRecord[];
  total: number;
  current: number;
  size: number;
}

export interface CreateExternalSystemParams {
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  entryUrl: string;
  ssoStartUrl?: string | null;
  authMode?: 'link' | 'oauth2';
  accessMode?: 'roles' | 'all';
  allowedRoles?: string[];
  category?: string;
  helpUrl?: string;
  feedbackUrl?: string;
  contact?: string;
  oauthClientId?: string | null;
  sort?: number;
  status?: Api.Common.EnableStatus;
}

export type UpdateExternalSystemParams = Partial<Omit<CreateExternalSystemParams, 'code'>>;

/** Systems visible to the current EIMS user. */
export function fetchPortalSystems() {
  return request<PortalSystemRecord[]>({ url: '/portal/systems' });
}

/** Ask the EIMS backend to authorize and prepare a system launch. */
export function fetchPortalSystemLaunch(code: string) {
  return request<PortalSystemLaunchResult>({
    url: `/portal/systems/${encodeURIComponent(code)}/launch`,
    method: 'post'
  });
}

/** Current user's EIMS roles, buttons and system access summary. */
export function fetchMyPortalPermissions() {
  return request<{ roles: string[]; buttons: string[]; permissions: string[]; systems: PortalSystemRecord[] }>({
    url: '/portal/me/permissions'
  });
}

/** Admin: list the system catalog. */
export function fetchExternalSystemPage(params: ExternalSystemPageParams) {
  return request<ExternalSystemPageData>({
    url: '/portal/admin/systems',
    method: 'get',
    params
  });
}

/** Admin: create a system catalog entry. */
export function fetchCreateExternalSystem(data: CreateExternalSystemParams) {
  return request<ExternalSystemRecord>({
    url: '/portal/admin/systems',
    method: 'post',
    data
  });
}

/** Admin: update a system catalog entry. */
export function fetchUpdateExternalSystem(id: number, data: UpdateExternalSystemParams) {
  return request<ExternalSystemRecord>({
    url: `/portal/admin/systems/${id}`,
    method: 'put',
    data
  });
}

/** Admin: delete a system catalog entry. */
export function fetchDeleteExternalSystem(id: number) {
  return request({
    url: `/portal/admin/systems/${id}`,
    method: 'delete'
  });
}
