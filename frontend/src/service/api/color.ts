import { request } from '../request';

/** get color page */
export function fetchColorPage(params: Api.Color.QueryParams) {
  return request<Api.Common.PaginatingQueryRecord<Api.Color.ColorRecord>>({
    url: '/mold-product/colors/page',
    method: 'get',
    params
  });
}

/** create color */
export function fetchCreateColor(data: Api.Color.CreateParams) {
  return request<Api.Color.ColorRecord>({
    url: '/mold-product/colors',
    method: 'post',
    data
  });
}

/** update color */
export function fetchUpdateColor(id: number, data: Api.Color.UpdateParams) {
  return request<Api.Color.ColorRecord>({
    url: `/mold-product/colors/${id}`,
    method: 'put',
    data
  });
}

/** delete color */
export function fetchDeleteColor(id: number) {
  return request<null>({
    url: `/mold-product/colors/${id}`,
    method: 'delete'
  });
}

/** get color detail */
export function fetchGetColor(id: number) {
  return request<Api.Color.ColorRecord>({
    url: `/mold-product/colors/${id}`,
    method: 'get'
  });
}
