import { request } from '../request';
import { getServiceBaseURL } from '@/utils/service';

const isHttpProxy = import.meta.env.DEV && import.meta.env.VITE_HTTP_PROXY === 'Y';

/**
 * Login
 *
 * @param userName User name
 * @param password Password
 */
export function fetchLogin(userName: string, password: string) {
  return request<Api.Auth.LoginToken>({
    url: '/auth/login',
    method: 'post',
    data: {
      userName,
      password
    }
  });
}

/** Get user info */
export function fetchGetUserInfo() {
  return request<Api.Auth.UserInfo>({ url: '/auth/getUserInfo' });
}

/**
 * Refresh token
 *
 * @param refreshToken Refresh token
 */
export function fetchRefreshToken(refreshToken: string) {
  return request<Api.Auth.LoginToken>({
    url: '/auth/refreshToken',
    method: 'post',
    data: {
      refreshToken
    }
  });
}

/** Get the DingTalk OAuth authorization URL. */
export function getDingTalkAuthorizationUrl() {
  const { baseURL } = getServiceBaseURL(import.meta.env, isHttpProxy);
  return `${baseURL}/auth/dingtalk/authorize`;
}

/** Exchange a one-time DingTalk login ticket for the application JWT pair. */
export function fetchDingTalkLoginToken(ticket: string) {
  return request<Api.Auth.LoginToken>({
    url: '/auth/dingtalk/exchange',
    method: 'post',
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
