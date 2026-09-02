import { request } from '../request';
import { getServiceBaseURL } from '@/utils/service';

const isHttpProxy = import.meta.env.DEV && import.meta.env.VITE_HTTP_PROXY === 'Y';
const silentAuthHeaders = {
  'X-Skip-Auth-Refresh': '1',
  'X-Skip-Auth-Error': '1'
};

/**
 * Login
 *
 * @param userName User name
 * @param password Password
 */
export function fetchLogin(userName: string, password: string) {
  return request<Api.Auth.SessionResult>({
    url: '/auth/login',
    method: 'post',
    headers: { 'X-Skip-Auth-Refresh': '1' },
    data: {
      userName,
      password
    }
  });
}

/** Get user info */
export function fetchGetUserInfo() {
  return request<Api.Auth.UserInfo>({
    url: '/auth/getUserInfo',
    headers: { ...silentAuthHeaders }
  });
}

/**
 * Refresh token
 *
 * @param refreshToken Refresh token
 */
export function fetchRefreshToken() {
  return request<Api.Auth.SessionResult>({
    url: '/auth/refreshToken',
    method: 'post',
    headers: { ...silentAuthHeaders }
  });
}

/** Revoke the current EIMS refresh session. */
export function fetchLogout() {
  return request({
    url: '/auth/logout',
    method: 'post',
    headers: { ...silentAuthHeaders }
  });
}

/** Get the DingTalk OAuth authorization URL. */
export function getDingTalkAuthorizationUrl() {
  const { baseURL } = getServiceBaseURL(import.meta.env, isHttpProxy);
  return `${baseURL}/auth/dingtalk/authorize`;
}

/** Exchange a one-time DingTalk login ticket for the application JWT pair. */
export function fetchDingTalkLoginToken(ticket: string) {
  return request<Api.Auth.SessionResult>({
    url: '/auth/dingtalk/exchange',
    method: 'post',
    headers: { 'X-Skip-Auth-Refresh': '1' },
    data: { ticket }
  });
}

/**
 * return custom backend error
 *
 * @param code error code
 * @param msg error message
 */
export function fetchCustomBackendError(code: string, msg: string) {
  return request({ url: '/auth/error', params: { code, msg } });
}
