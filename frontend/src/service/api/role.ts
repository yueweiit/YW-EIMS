import { request } from '../request';

export type RoleStatus = Api.Common.EnableStatus;
export type PermissionType = 'menu' | 'button' | 'api';

export interface RoleOption {
  id: number;
  code: string;
  name: string;
  status: RoleStatus;
}

export interface RoleRecord {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  builtIn: boolean;
  sort: number;
  status: RoleStatus;
  systemCodes: string[];
  permissionCodes: string[];
  createBy?: string | null;
  createTime: string;
  updateBy?: string | null;
  updateTime: string;
}

export interface RolePageParams {
  current: number;
  size: number;
  name?: string;
  status?: RoleStatus;
}

export interface RolePageData {
  records: RoleRecord[];
  total: number;
  current: number;
  size: number;
}

export interface CreateRoleParams {
  code: string;
  name: string;
  description?: string;
  sort?: number;
  status?: RoleStatus;
}

export type UpdateRoleParams = Partial<Omit<CreateRoleParams, 'code'>>;

export interface RoleAccessSystem {
  code: string;
  name: string;
  status: RoleStatus;
  accessMode: 'roles' | 'all';
  sort: number;
}

export interface PermissionRecord {
  id: number;
  code: string;
  name: string;
  type: PermissionType;
  systemCode?: string | null;
  parentCode?: string | null;
  routePath?: string | null;
  description?: string | null;
  sort: number;
  status: RoleStatus;
  createBy?: string | null;
  createTime: string;
  updateBy?: string | null;
  updateTime: string;
}

export interface RoleAccessCatalog {
  systems: RoleAccessSystem[];
  permissions: PermissionRecord[];
}

export interface UpdateRoleAccessParams {
  systemCodes: string[];
  permissionCodes: string[];
}

export interface PermissionPageParams {
  current: number;
  size: number;
  name?: string;
  type?: PermissionType;
  status?: RoleStatus;
}

export interface PermissionPageData {
  records: PermissionRecord[];
  total: number;
  current: number;
  size: number;
}

export interface CreatePermissionParams {
  code: string;
  name: string;
  type?: PermissionType;
  systemCode?: string;
  parentCode?: string;
  routePath?: string;
  description?: string;
  sort?: number;
  status?: RoleStatus;
}

export type UpdatePermissionParams = Partial<Omit<CreatePermissionParams, 'code'>>;

export function fetchRolePage(params: RolePageParams) {
  return request<RolePageData>({ url: '/roles', method: 'get', params });
}

export function fetchRoleOptions() {
  return request<RoleOption[]>({ url: '/roles/options', method: 'get' });
}

export function fetchRole(id: number) {
  return request<RoleRecord>({ url: `/roles/${id}`, method: 'get' });
}

export function fetchCreateRole(data: CreateRoleParams) {
  return request<RoleRecord>({ url: '/roles', method: 'post', data });
}

export function fetchUpdateRole(id: number, data: UpdateRoleParams) {
  return request<RoleRecord>({ url: `/roles/${id}`, method: 'put', data });
}

export function fetchDeleteRole(id: number) {
  return request<boolean>({ url: `/roles/${id}`, method: 'delete' });
}

export function fetchRoleAccessCatalog() {
  return request<RoleAccessCatalog>({ url: '/roles/catalog', method: 'get' });
}

export function fetchUpdateRoleAccess(id: number, data: UpdateRoleAccessParams) {
  return request<RoleRecord>({ url: `/roles/${id}/access`, method: 'put', data });
}

export function fetchPermissionPage(params: PermissionPageParams) {
  return request<PermissionPageData>({ url: '/permissions', method: 'get', params });
}

export function fetchPermission(id: number) {
  return request<PermissionRecord>({ url: `/permissions/${id}`, method: 'get' });
}

export function fetchCreatePermission(data: CreatePermissionParams) {
  return request<PermissionRecord>({ url: '/permissions', method: 'post', data });
}

export function fetchUpdatePermission(id: number, data: UpdatePermissionParams) {
  return request<PermissionRecord>({ url: `/permissions/${id}`, method: 'put', data });
}

export function fetchDeletePermission(id: number) {
  return request<boolean>({ url: `/permissions/${id}`, method: 'delete' });
}
