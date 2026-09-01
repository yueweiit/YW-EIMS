import { request } from "../request";

export interface OAuth2BindingRecord {
  id: number;
  ssoUserId: number;
  clientId: string;
  appUserId: string;
  appUsername?: string;
  createdAt: string;
  updatedAt: string;
  ssoUser?: {
    id: number;
    userName: string;
    realName?: string;
  };
  client?: {
    clientId: string;
    name: string;
  };
}

export interface OAuth2BindingPageParams {
  current: number;
  size: number;
  ssoUserId?: number;
  clientId?: string;
}

export interface OAuth2BindingPageData {
  records: OAuth2BindingRecord[];
  total: number;
  current: number;
  size: number;
}

export interface CreateOAuth2BindingParams {
  ssoUserId: number;
  clientId: string;
  appUserId: string;
  appUsername?: string;
}

export interface UpdateOAuth2BindingParams {
  appUserId: string;
  appUsername?: string | null;
}

export interface OAuth2AuthorizeConfirmParams {
  transaction_id: string;
  consent: "true" | "false";
}

export interface OAuth2AuthorizeConfirmResult {
  redirectUrl: string;
}

export interface OAuth2AuthorizeRequest {
  transactionId: string;
  clientName: string;
  scopes: string[];
}

/** Get binding list */
export function fetchOAuth2BindingPage(params: OAuth2BindingPageParams) {
  return request<OAuth2BindingPageData>({
    url: "/oauth2/bindings",
    method: "get",
    params,
  });
}

/** Create binding */
export function fetchCreateOAuth2Binding(data: CreateOAuth2BindingParams) {
  return request<OAuth2BindingRecord>({
    url: "/oauth2/bindings",
    method: "post",
    data,
  });
}

/** Delete binding */
export function fetchDeleteOAuth2Binding(id: number) {
  return request({
    url: `/oauth2/bindings/${id}`,
    method: "delete",
  });
}

/** Update a binding's target account. */
export function fetchUpdateOAuth2Binding(id: number, data: UpdateOAuth2BindingParams) {
  return request<OAuth2BindingRecord>({
    url: `/oauth2/bindings/${id}`,
    method: 'put',
    data
  });
}
