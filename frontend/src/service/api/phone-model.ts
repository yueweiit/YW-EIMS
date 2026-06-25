import { request } from '../request';

/** get phone model page */
export function fetchPhoneModelPage(params: Api.PhoneModel.QueryParams) {
  return request<Api.Common.PaginatingQueryRecord<Api.PhoneModel.PhoneModelRecord>>({
    url: '/mold-product/phone-models/page',
    method: 'get',
    params
  });
}

/** create phone model */
export function fetchCreatePhoneModel(data: Api.PhoneModel.CreateParams) {
  return request<Api.PhoneModel.PhoneModelRecord>({
    url: '/mold-product/phone-models',
    method: 'post',
    data
  });
}

/** update phone model */
export function fetchUpdatePhoneModel(id: number, data: Api.PhoneModel.UpdateParams) {
  return request<Api.PhoneModel.PhoneModelRecord>({
    url: `/mold-product/phone-models/${id}`,
    method: 'put',
    data
  });
}

/** delete phone model */
export function fetchDeletePhoneModel(id: number) {
  return request<null>({
    url: `/mold-product/phone-models/${id}`,
    method: 'delete'
  });
}

/** get phone model detail */
export function fetchGetPhoneModel(id: number) {
  return request<Api.PhoneModel.PhoneModelRecord>({
    url: `/mold-product/phone-models/${id}`,
    method: 'get'
  });
}
