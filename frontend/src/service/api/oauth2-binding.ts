import { request } from "../request";

export interface OAuth2BindingRecord {
  id: number;
  ssoUserId: number;
  clientId: string;
  appUserId: number;
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
  appUserId: number;
  appUsername?: string;
}

export interface OAuth2AuthorizeConfirmParams {
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state?: string;
  consent: "true" | "false";
  code_challenge?: string;
  code_challenge_method?: string;
}

export interface OAuth2AuthorizeConfirmResult {
  redirectUrl: string;
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
