import { request } from '../request';

export interface OAuth2ClientRecord {
  id: number;
  clientId: string;
  clientSecret?: string;
  name: string;
  description?: string;
  redirectUris: string[];
  scopes: string[];
  pkceRequired: boolean;
  status: string;
  createBy?: string;
  createTime: string;
  updateBy?: string;
  updateTime: string;
}

export interface OAuth2ClientPageParams {
  current: number;
  size: number;
  name?: string;
}

export interface OAuth2ClientPageData {
  records: OAuth2ClientRecord[];
  total: number;
  current: number;
  size: number;
}

export interface CreateOAuth2ClientParams {
  name: string;
  description?: string;
  redirectUris: string[];
  scopes?: string[];
  pkceRequired?: boolean;
  status?: string;
}

export interface UpdateOAuth2ClientParams {
  name?: string;
  description?: string;
  redirectUris?: string[];
  scopes?: string[];
  pkceRequired?: boolean;
  status?: string;
}

/** Get OAuth2 client list */
export function fetchOAuth2ClientPage(params: OAuth2ClientPageParams) {
  return request<OAuth2ClientPageData>({
    url: '/oauth2/clients',
    method: 'get',
    params
  });
}

/** Get single OAuth2 client */
export function fetchOAuth2Client(id: number) {
  return request<OAuth2ClientRecord>({
    url: `/oauth2/clients/${id}`,
    method: 'get'
  });
}

/** Create OAuth2 client */
export function fetchCreateOAuth2Client(data: CreateOAuth2ClientParams) {
  return request<OAuth2ClientRecord>({
    url: '/oauth2/clients',
    method: 'post',
    data
  });
}

/** Update OAuth2 client */
export function fetchUpdateOAuth2Client(id: number, data: UpdateOAuth2ClientParams) {
  return request<OAuth2ClientRecord>({
    url: `/oauth2/clients/${id}`,
    method: 'put',
    data
  });
}

/** Delete OAuth2 client */
export function fetchDeleteOAuth2Client(id: number) {
  return request({
    url: `/oauth2/clients/${id}`,
    method: 'delete'
  });
}

/** Reset OAuth2 client secret */
export function fetchResetOAuth2ClientSecret(id: number) {
  return request<{ clientId: string; clientSecret: string }>({
    url: `/oauth2/clients/${id}/reset-secret`,
    method: 'post'
  });
}
