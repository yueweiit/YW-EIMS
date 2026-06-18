import { request } from '../request';

/** get user page */
export function fetchUserPage(params: Api.User.QueryParams) {
  return request<Api.Common.PaginatingQueryRecord<Api.User.UserRecord>>({
    url: '/user/page',
    method: 'get',
    params
  });
}

/** create user */
export function fetchCreateUser(data: Api.User.CreateParams) {
  return request<Api.User.UserRecord>({
    url: '/user',
    method: 'post',
    data
  });
}

/** update user */
export function fetchUpdateUser(id: number, data: Api.User.UpdateParams) {
  return request<Api.User.UserRecord>({
    url: `/user/${id}`,
    method: 'put',
    data
  });
}

/** delete user */
export function fetchDeleteUser(id: number) {
  return request<null>({
    url: `/user/${id}`,
    method: 'delete'
  });
}

/** get user detail */
export function fetchGetUser(id: number) {
  return request<Api.User.UserRecord>({
    url: `/user/${id}`,
    method: 'get'
  });
}
