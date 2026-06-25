import { request } from '../request';

/** get mold code page */
export function fetchMoldCodePage(params: Api.MoldCode.QueryParams) {
  return request<Api.Common.PaginatingQueryRecord<Api.MoldCode.MoldCodeRecord>>({
    url: '/mold-product/mold-codes/page',
    method: 'get',
    params
  });
}

/** create mold code */
export function fetchCreateMoldCode(data: Api.MoldCode.CreateParams) {
  return request<Api.MoldCode.MoldCodeRecord>({
    url: '/mold-product/mold-codes',
    method: 'post',
    data
  });
}

/** update mold code */
export function fetchUpdateMoldCode(id: number, data: Api.MoldCode.UpdateParams) {
  return request<Api.MoldCode.MoldCodeRecord>({
    url: `/mold-product/mold-codes/${id}`,
    method: 'put',
    data
  });
}

/** delete mold code */
export function fetchDeleteMoldCode(id: number) {
  return request<null>({
    url: `/mold-product/mold-codes/${id}`,
    method: 'delete'
  });
}

/** get mold code detail */
export function fetchGetMoldCode(id: number) {
  return request<Api.MoldCode.MoldCodeRecord>({
    url: `/mold-product/mold-codes/${id}`,
    method: 'get'
  });
}
